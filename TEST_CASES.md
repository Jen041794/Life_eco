# Life_eco 測試案例（面試講解版）

> 這份文件把 Life_eco 後端 API 的測試流程，整理成可以「開口講清楚」的測試案例。
> 每一組前面都有一段「這組在測什麼、風險在哪」，後面接標準測試案例表格。
> 對象：後端 / QA / SDET 面試時，用來說明我怎麼設計測試、覆蓋哪些風險。

---

## 面試怎麼用這份文件（3 分鐘框架）

面試官問「你怎麼測這個系統？」時，照這個順序講：

1. **先講策略，不要一開始就報案例。**
   我用「風險導向 + 分層」的方式測：
   - **分層**：認證授權 → 商品 → 訂單 → 付款 → 會員管理，由外而內。
   - **每個 API 一定測三種**：正向（happy path）、負向（錯誤輸入）、權限邊界（越權）。
   - **重點放在有商業邏輯的地方**：訂單扣庫存、交易一致性、付款只能付一次、狀態流轉，這些出錯會直接影響金流與庫存，是我優先且測最深的地方。

2. **再挑 2～3 個最有亮點的案例深入講。** 推薦這幾個（下面表格都有）：
   - `ORD-05` 庫存不足要**整筆回滾**（transaction 一致性）。
   - `ORD-08` 訂單金額用**下單當下的價格快照**，事後改價不影響舊訂單。
   - `PAY-03` 同一張訂單**不能付第二次**（OneToOne）。
   - `PAY-06` Stripe 付款後端**回頭查證金額**，防止前端竄改金額。

3. **最後補一句測試以外的視角**：我出身軟體測試，習慣同時看「功能對不對」和「權限有沒有破口」，所以每張表都有一整組越權測試。

---

## 術語與共用前置條件

| 代號 | 說明 |
|------|------|
| **admin** | superuser，`is_staff=True`，可管理商品、看全部訂單/付款、管理會員 |
| **userA / userB** | 兩個一般會員，用來測「只能看到自己的資料」與越權 |
| **匿名** | 未帶 token 的請求 |

共用前置：MySQL 已啟動、migrate 完成、server 跑起來、admin 與 userA/userB 已建立，需帶 token 的請求先在 Swagger「Authorize」貼上 `Bearer <access token>`。

案例「類型」標記：**正向** = 正常流程、**負向** = 錯誤輸入、**邊界** = 極端/臨界值、**權限** = 越權與授權。

---

## 1. 認證與授權（user / JWT）

**這組在測什麼**：註冊登入拿 token，以及「拿到 token 之後只能看到自己」。
**風險點**：密碼外洩（回傳把密碼吐回來）、弱密碼放行、越權看到別人的帳號資料。

| TC ID | 類型 | 測試情境 | 前置條件 | 測試步驟（含資料） | 預期結果 |
|-------|------|----------|----------|----------------------|----------|
| AUTH-01 | 正向 | 註冊成功 | 無 | `POST /api/user/register/`，body `{"username":"userA","email":"a@test.com","password":"test12345"}` | 201；回傳只有 id/username/email |
| AUTH-02 | 負向 | 回應不可含密碼 | AUTH-01 | 檢查 AUTH-01 的回應 body | 沒有 `password` 欄位（write_only 生效） |
| AUTH-03 | 負向 | 重複帳號 | userA 已存在 | 用同一個 username 再註冊一次 | 400「這個帳號已經有人用了」 |
| AUTH-04 | 邊界 | 弱密碼被擋 | 無 | 註冊時 `"password":"123"` | 400（min_length=8 擋下） |
| AUTH-05 | 正向 | 登入拿 token | userA 已註冊 | `POST /api/user/login/` 帶正確帳密 | 200；回傳 `access` + `refresh` |
| AUTH-06 | 負向 | 錯誤密碼 | userA 已註冊 | 登入帶錯的密碼 | 401 |
| AUTH-07 | 正向 | refresh 換新 token | 有 refresh token | `POST /api/token/refresh/` 帶 refresh | 200；拿到新的 access |
| AUTH-08 | 權限 | 未登入擋下 | 無 | `GET /api/user/me/` 不帶 token | 401 |
| AUTH-09 | 正向 | 看自己的資料 | userA 已登入 | `GET /api/user/me/` 帶 userA token | 200；回傳的是 userA 本人 |
| AUTH-10 | 權限 | 一般人只看得到自己 | userA/userB 存在 | `GET /api/user/` 帶 userA token | 只回 userA 一筆，看不到 userB |
| AUTH-11 | 權限 | 管理員看全部 | 多個使用者存在 | `GET /api/user/` 帶 admin token | 回傳所有使用者 |

---

## 2. 商品（products）— 權限邊界與上下架

**這組在測什麼**：商品「誰能改」與「誰看得到哪些」。
**風險點**：一般人竟然能改/刪商品（授權破口）、已下架商品仍出現在前台顧客頁。

| TC ID | 類型 | 測試情境 | 前置條件 | 測試步驟（含資料） | 預期結果 |
|-------|------|----------|----------|----------------------|----------|
| PROD-01 | 正向 | 公開瀏覽 | 有商品 | `GET /api/products/` 不帶 token | 200；所有人可看 |
| PROD-02 | 正向 | 關鍵字搜尋 | 有商品 | `GET /api/products/?search=關鍵字` | 只回名稱/說明含關鍵字的商品 |
| PROD-03 | 正向 | 價格排序 | 有多個商品 | `GET /api/products/?ordering=price` | 依價格由小到大排序 |
| PROD-04 | 負向 | 查不存在商品 | 無 | `GET /api/products/{不存在id}/` | 404 |
| PROD-05 | 權限 | 一般人不能新增 | userA 登入 | `POST /api/products/` 帶 userA token | 403 |
| PROD-06 | 權限 | 匿名不能新增 | 無 | `POST /api/products/` 不帶 token | 401 |
| PROD-07 | 正向 | 管理員新增 | admin 登入 | `POST /api/products/` 帶 admin，body `{"name":"測試商品","price":"100.00","stock":10}` | 201；記下 id 供訂單用 |
| PROD-08 | 正向 | 管理員修改 | 有商品、admin | `PATCH /api/products/{id}/` 改價格/庫存 | 200 |
| PROD-09 | 權限 | 刪除權限分流 | 有商品 | `DELETE /api/products/{id}/` 分別帶 userA 與 admin | userA→403；admin→204 |
| PROD-10 | 邊界 | 價格非法值 | admin | 新增商品 `price` 給負數或非數字 | 400 |
| PROD-11 | 邊界 | 圖片數量上限 | admin | 建立商品時用 multipart 上傳 4 張 `images` | 400「最多只能上傳 3 張」 |
| PROD-12 | 權限 | 下架品前台看不到 | 有 `is_active=False` 的商品 | 以 userA（或匿名）`GET /api/products/` | 回傳清單**不含**下架商品 |
| PROD-13 | 權限 | 管理員後台看得到下架品 | 同上 | admin `GET /api/products/`（不帶 storefront） | 回傳清單**含**下架商品 |
| PROD-14 | 邊界 | 管理員逛前台也只看上架 | 同上 | admin `GET /api/products/?storefront=1` | 回傳清單**不含**下架商品 |

> **講解亮點（PROD-12～14）**：上下架不是只靠角色判斷，而是「前台情境（storefront=1）一律只看上架、後台管理才看全部」。所以我特別測「管理員逛前台」這個容易漏掉的情境，確認 admin 帶 `storefront=1` 時也看不到下架品。

---

## 3. 訂單（orders）— 核心流程

**這組在測什麼**：下單要正確算錢、扣庫存、綁在本人身上，且中途失敗不能留半成品。
**風險點**：超賣（庫存扣成負數）、部分扣庫存的髒資料、算錯總價、看到別人的訂單。

### 3-1 建立訂單

| TC ID | 類型 | 測試情境 | 前置條件 | 測試步驟（含資料） | 預期結果 |
|-------|------|----------|----------|----------------------|----------|
| ORD-01 | 權限 | 未登入不能下單 | 無 | `POST /api/orders/` 不帶 token | 401 |
| ORD-02 | 正向 | 正常下單 | 商品1(stock=10)、商品2(stock=5)、userA 登入 | `POST /api/orders/` 帶 userA，body：`{"items":[{"product":1,"quantity":2},{"product":2,"quantity":1}],"recipient_name":"王小明","recipient_phone":"0912345678","shipping_address":"台北市…"}` | 201；`status`=`pending` |
| ORD-03 | 正向 | 總價正確 | ORD-02 | 檢查回傳 `total_price` | = 商品1價×2 + 商品2價×1（手算對照） |
| ORD-04 | 正向 | 庫存有被扣 | ORD-02 | `GET /api/products/1/` | stock 少了 2 |
| ORD-05 | 邊界 | 庫存不足整筆回滾 | 商品stock=5 | 下單 `quantity:999`，成立後再 `GET` 商品 | 400「庫存不足」；且商品 stock **沒被扣**、沒有殘留訂單 |
| ORD-06 | 邊界 | 空購物車 | userA 登入 | body `{"items":[], …}` | 400「訂單至少要有一項商品」 |
| ORD-07 | 邊界 | 數量非法 | userA 登入 | 某項 `quantity:0` 或負數 | 400（min_value=1） |
| ORD-08 | 邊界 | 不存在的商品 | userA 登入 | 某項 `product:99999` | 400 |
| ORD-09 | 負向 | 收件人必填 | userA 登入 | 下單省略 `recipient_name` | 400（結帳必填欄位） |
| ORD-10 | 邊界 | 手機格式驗證 | userA 登入 | `recipient_phone:"12345"`（非 09 開頭 10 碼） | 400「手機需為 09 開頭、共 10 碼數字」 |

> **講解亮點（ORD-05）**：這是我測最深的一條。建立訂單被 `transaction.atomic()` 包起來，我故意讓「多項商品中的其中一項」庫存不足，驗證的不只是回傳 400，而是**前面已經扣掉的庫存有沒有被回滾**。如果沒有交易保護，就會出現「訂單失敗但庫存被扣掉」的髒資料。這是純看 API 回應看不出來、必須回頭查資料狀態的案例。

### 3-2 只看自己的訂單（越權）

| TC ID | 類型 | 測試情境 | 前置條件 | 測試步驟 | 預期結果 |
|-------|------|----------|----------|----------|----------|
| ORD-11 | 權限 | 只列自己的訂單 | userA 有訂單 | `GET /api/orders/` 帶 userA | 只看到 userA 的訂單 |
| ORD-12 | 權限 | 看不到別人的列表 | userA 有訂單 | `GET /api/orders/` 帶 userB | 看不到 userA 的訂單 |
| ORD-13 | 權限 | 直接指定別人訂單 id | userA 訂單 id 已知 | userB `GET /api/orders/{userA訂單id}/` | 404（不是 403，避免洩漏「存在」） |
| ORD-14 | 權限 | 管理員看全部 | 多人有訂單 | admin `GET /api/orders/` | 看得到所有人的訂單 |
| ORD-15 | 權限 | 訂單項目也只看自己 | userA 有訂單 | `GET /api/orders/items/` 帶 userA | 只看到自己訂單的項目 |

> **講解亮點（ORD-13）**：越權讀取回 **404 而不是 403** 是刻意的——403 等於告訴攻擊者「這個 id 存在、只是你沒權限」，404 連存在與否都不透露。這是我會特別對照的安全細節。

### 3-3 訂單狀態流轉與取消

**這組在測什麼**：訂單狀態只能「合法地往前走」，取消要把庫存還回去。
**風險點**：狀態亂跳（未付款直接完成）、已出貨還能取消、取消沒回補庫存。

| TC ID | 類型 | 測試情境 | 前置條件 | 測試步驟（含資料） | 預期結果 |
|-------|------|----------|----------|----------------------|----------|
| ORD-16 | 正向 | 合法狀態推進 | 有 `paid` 訂單、admin | `PATCH /api/orders/{id}/status/` body `{"status":"shipped"}` | 200；狀態變 shipped |
| ORD-17 | 負向 | 不能跳關 | 有 `pending` 訂單、admin | `PATCH …/status/` 直接改 `completed` | 400「不允許從 pending 改成 completed」 |
| ORD-18 | 負向 | 不能改成同狀態 | 有 `pending` 訂單、admin | `PATCH …/status/` 改 `pending` | 400「訂單已經是 pending 狀態了」 |
| ORD-19 | 權限 | 一般人不能改狀態 | 有訂單、userA | `PATCH …/status/` 帶 userA | 403（IsAdminUser） |
| ORD-20 | 正向 | 取消未付款訂單並回補庫存 | userA 有 `pending` 訂單 | `POST /api/orders/{id}/cancel/` 帶 userA，之後 `GET` 商品 | 200；狀態變 cancelled；商品 stock **加回** |
| ORD-21 | 負向 | 一般人不能取消已付款 | userA 有 `paid` 訂單 | `POST …/cancel/` 帶 userA | 403「已付款請聯絡客服」 |
| ORD-22 | 正向 | 管理員可取消已付款並退款 | 有 `paid` 訂單（已付款）、admin | `POST …/cancel/` 帶 admin，之後查 payment | 200；訂單 cancelled、庫存回補、payment 狀態變 refunded |
| ORD-23 | 負向 | 已出貨不能取消 | 有 `shipped` 訂單 | `POST …/cancel/` | 400「已出貨的訂單不能取消」 |

> **講解亮點（ORD-17、ORD-22）**：狀態流轉我用「狀態機」的角度測——只驗合法轉換（pending→paid→shipped→completed），非法轉換全部擋掉。取消訂單則是「複合副作用」的案例：一次要驗三件事（訂單狀態、庫存回補、已付款要退款），而且同樣包在 transaction 裡，任何一步失敗都要一起回滾。

---

## 4. 付款（payments）— mock 金流 + Stripe 驗證

**這組在測什麼**：一張訂單只能付一次、只能付自己的、付完訂單要變已付款；接 Stripe 時金額不能被前端竄改。
**風險點**：重複付款、代付別人訂單、前端偽造付款成功或金額。

### 4-1 mock 金流（測試/demo 用）

| TC ID | 類型 | 測試情境 | 前置條件 | 測試步驟（含資料） | 預期結果 |
|-------|------|----------|----------|----------------------|----------|
| PAY-01 | 權限 | 未登入不能付款 | 無 | `POST /api/payments/` 不帶 token | 401 |
| PAY-02 | 正向 | mock 付款成功 | userA 有訂單 | `POST /api/payments/` 帶 userA，body `{"order":<userA訂單id>,"provider":"mock"}` | 201；`status`=success、`transaction_id` 以 `mock_` 開頭、`amount`=訂單總價 |
| PAY-03 | 負向 | 訂單付完會變已付款 | PAY-02 | `GET /api/orders/{該訂單id}/` | `status` 變 `paid` |
| PAY-04 | 負向 | 不能付第二次 | 已付款訂單 | 對同一張訂單再 `POST /api/payments/` | 400「這筆訂單已經付款過了」（OneToOne） |
| PAY-05 | 權限 | 不能付別人的訂單 | userA 有訂單 | userB `POST /api/payments/` body `{"order":<userA訂單id>}` | 400「這不是你的訂單」 |
| PAY-06 | 負向 | 不存在的訂單 | 無 | `POST /api/payments/` `{"order":99999}` | 400 |
| PAY-07 | 權限 | 只看得到自己的付款 | userA/userB 各有付款 | `GET /api/payments/` 帶 userA | 只看到自己的，看不到 userB 的 |

### 4-2 Stripe 付款（防竄改驗證）

| TC ID | 類型 | 測試情境 | 前置條件 | 測試步驟（含資料） | 預期結果 |
|-------|------|----------|----------|----------------------|----------|
| PAY-08 | 正向 | 建立 PaymentIntent | userA 有訂單 | `POST /api/payments/create-intent/` `{"order":<id>}` | 200；回傳 `client_secret` |
| PAY-09 | 負向 | 缺 payment_intent_id | provider=stripe | `POST /api/payments/` `{"order":<id>,"provider":"stripe"}` 不帶 intent | 400「Stripe 付款需附 payment_intent_id」 |
| PAY-10 | 負向 | intent 尚未成功 | 有一個 status≠succeeded 的 intent | 帶該 intent 寫入付款 | 400「這筆 Stripe 付款尚未成功」 |
| PAY-11 | 邊界 | 金額被竄改 | intent 金額與訂單不符 | 帶金額不符的 intent 寫入付款 | 400「付款金額與訂單不符」 |
| PAY-12 | 負向 | Stripe 連線失敗回 502 | 金鑰/連線異常 | `POST …/create-intent/` | 502「Stripe 連線失敗：…」（不噴 500 stack） |

> **講解亮點（PAY-11）**：這是我最想在後端面試講的一條。前端呼叫 Stripe 拿到成功結果後，**後端不盲信前端**，會拿 `payment_intent_id` 回頭跟 Stripe 查證，比對「狀態是不是 succeeded」「金額（換算成分）和幣別是不是跟訂單相符」。所以我設計一條「金額被竄改」的案例——就算前端傳了合法的 intent，只要金額對不上訂單就擋掉。這展示我懂「信任邊界」在哪裡。

---

## 5. 會員管理（後台）

**這組在測什麼**：管理員能停用/啟用會員，但不能把自己鎖在門外。
**風險點**：管理員誤停自己（自我鎖定）、一般人拿到管理權限。

| TC ID | 類型 | 測試情境 | 前置條件 | 測試步驟（含資料） | 預期結果 |
|-------|------|----------|----------|----------------------|----------|
| USER-01 | 權限 | 一般人不能停用帳號 | userA、userB | userA `POST /api/user/{userB id}/deactivate/` | 403（IsAdminUser） |
| USER-02 | 正向 | 管理員停用會員 | admin、userB | admin `POST /api/user/{userB id}/deactivate/` | 200；userB `is_active`=False |
| USER-03 | 負向 | 停用後無法登入 | USER-02 | userB 用正確帳密登入 | 401（帳號已停用） |
| USER-04 | 邊界 | 不能停用自己 | admin | admin `POST /api/user/{admin自己id}/deactivate/` | 400「不能停用自己的帳號」 |
| USER-05 | 正向 | 重新啟用 | userB 已停用 | admin `POST /api/user/{userB id}/activate/` | 200；userB 可再登入 |
| USER-06 | 邊界 | 編輯會員不能停用自己 | admin | admin `PATCH /api/user/{admin自己id}/update-info/` `{"is_active":false}` | 400「不能停用自己的帳號」 |
| USER-07 | 正向 | 讀寫自己的個人資料 | userA 登入 | `PATCH /api/user/profile/` `{"phone":"0912345678","address":"…"}` | 200；只動到自己的 profile |
| USER-08 | 邊界 | 個人資料手機格式 | userA 登入 | `PATCH /api/user/profile/` `{"phone":"123"}` | 400（手機格式錯誤） |

> **講解亮點（USER-04、USER-06）**：「不能停用自己」有兩條路徑——直接 deactivate、以及編輯會員時把 is_active 設 false，兩條都要擋。這是「同一條業務規則、多個入口」的案例，提醒自己別只測一個入口就以為過了。

---

## 6. 文件 / 整體回歸

| TC ID | 類型 | 測試情境 | 測試步驟 | 預期結果 |
|-------|------|----------|----------|----------|
| DOC-01 | 正向 | Swagger 端點齊全 | 開 `/swagger/` | 五個 app（user/products/orders/payments/會員）端點都列出 |
| DOC-02 | 正向 | ReDoc 可開 | 開 `/redoc/` | 正常顯示 |
| DOC-03 | 正向 | swagger.json 正常 | 開 `/swagger.json` | 回得出 JSON |

---

## 7. 權限總表（快速回歸用）

| 操作 | 匿名 | userA | userB（別人） | admin |
|------|------|-------|---------------|-------|
| 看商品列表 | ✅ | ✅ | ✅ | ✅ |
| 看下架商品 | ❌ | ❌ | ❌ | ✅（後台） |
| 新增/改/刪商品 | 401 | 403 | 403 | ✅ |
| 建立訂單 | 401 | ✅ | ✅ | ✅ |
| 看 A 的訂單 | 401 | ✅（自己） | 404 | ✅ |
| 改訂單狀態 | 401 | 403 | 403 | ✅ |
| 取消 A 的未付款單 | 401 | ✅（自己） | 404 | ✅ |
| 取消 A 的已付款單 | 401 | 403 | 404 | ✅（含退款） |
| 付 A 的訂單 | 401 | ✅ | 400 | ✅ |
| 看使用者列表 | 401 | 只有自己 | 只有自己 | 全部 |
| 停用/啟用會員 | 401 | 403 | 403 | ✅（不能停自己） |

---

### 備註
- mock 金流永遠成功；若要測「付款失敗」情境，把 `payments/serializers.py` 的 `success = True` 暫時改成 `False`，預期：payment.status=`failed` 且訂單**不會**變 paid。
- 這份取代舊的 `API_TEST_CHECKLIST.md`（舊版尚未涵蓋收件資訊必填、狀態流轉、取消/退款、Stripe 驗證、會員停用）。
