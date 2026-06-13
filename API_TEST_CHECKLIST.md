# Life_eco API 測試清單

> 測試方式：啟動 server 後打開 `http://127.0.0.1:8000/swagger/`，多數操作直接在 Swagger UI 點。
> 需要帶 token 的請求，先在 Swagger 右上「Authorize」貼上 `Bearer <access token>`。
> 每個項目後面的 `→ 200` 是「預期的 HTTP 狀態碼」，對得上才算過。

---

## 0. 前置準備

- [ ] MySQL 服務已啟動（連得到 localhost:3306）
- [ ] `python manage.py makemigrations` 成功
- [ ] `python manage.py migrate` 成功
- [ ] `python manage.py createsuperuser` 建好一個管理員（記住帳密）
- [ ] `python manage.py runserver` 跑起來，`/swagger/` 打得開
- [ ] 準備兩個測試身分：
  - **admin**：上面建的 superuser（is_staff=True）
  - **user A / user B**：等下用 register 各註冊一個一般帳號

---

## 1. 認證流程（user / JWT）

### 註冊
- [ ] `POST /api/user/register/`，body `{"username":"userA","email":"a@test.com","password":"test12345"}` → **201**
- [ ] 回傳內容**沒有**把 password 吐回來（只應有 id/username/email）→ 確認
- [ ] 重複用同一個 username 再註冊一次 → **400**（「這個帳號已經有人用了」）
- [ ] 密碼太短 `"password":"123"` → **400**（min_length=8 擋下）
- [ ] 再註冊一個 userB 備用 → **201**

### 登入取得 token
- [ ] `POST /api/user/login/`，正確帳密 → **200**，拿到 `access` 與 `refresh`
- [ ] 錯誤密碼登入 → **401**
- [ ] `POST /api/token/refresh/`，帶剛剛的 refresh → **200**，拿到新的 access
- [ ] `GET /api/user/me/` 不帶 token → **401**
- [ ] `GET /api/user/me/` 帶 userA 的 token → **200**，回傳的是 userA 自己
- [ ] `GET /api/user/` 帶 userA token → 只看得到自己一筆（不是全部使用者）
- [ ] `GET /api/user/` 帶 admin token → 看得到所有使用者

---

## 2. 商品（products）— 權限邊界

### 讀取（公開）
- [ ] `GET /api/products/` 不帶 token → **200**（所有人可看）
- [ ] `GET /api/products/?search=關鍵字` → 只回名稱/說明含關鍵字的商品
- [ ] `GET /api/products/?ordering=price` → 依價格排序
- [ ] `GET /api/products/{不存在的id}/` → **404**

### 新增 / 修改 / 刪除（限管理員）
- [ ] `POST /api/products/` 帶 **userA** token → **403**（一般人不能新增）
- [ ] `POST /api/products/` 不帶 token → **401**
- [ ] `POST /api/products/` 帶 **admin** token，body `{"name":"測試商品","price":"100.00","stock":10}` → **201**
- [ ] 記下這個商品的 id，等下訂單會用到
- [ ] `PUT/PATCH /api/products/{id}/` 帶 admin 改價格/庫存 → **200**
- [ ] `DELETE /api/products/{id}/` 帶 userA → **403**；帶 admin → **204**
- [ ] 邊界：`price` 給負數或非數字 → **400**

---

## 3. 訂單（orders）— 核心流程

> 先用 admin 建好至少兩個有庫存的商品，例如 商品1(stock=10)、商品2(stock=5)。

### 建立訂單（一次帶 items）
- [ ] `POST /api/orders/` 不帶 token → **401**
- [ ] 帶 userA token，body：
  ```json
  { "items": [ {"product": 1, "quantity": 2}, {"product": 2, "quantity": 1} ] }
  ```
  → **201**
- [ ] 回傳的 `total_price` = 商品1價格×2 + 商品2價格×1（自己手算對一下）→ 確認
- [ ] `status` 應為 `pending`
- [ ] 回去 `GET /api/products/1/`，stock 應該**少了 2**（庫存有被扣）→ 確認

### 邊界 / 負向
- [ ] 空購物車 `{"items": []}` → **400**（「訂單至少要有一項商品」）
- [ ] 數量 0 或負數 `quantity: 0` → **400**（min_value=1）
- [ ] 不存在的商品 `product: 99999` → **400**
- [ ] 庫存不足：某商品 stock=5 卻下 `quantity: 999` → **400**（「庫存不足」）
- [ ] 庫存不足那筆要驗證**整筆回滾**：失敗後再 `GET` 同訂單的商品，stock **沒有被扣**（transaction 有效）→ 確認

### 只看自己的
- [ ] `GET /api/orders/` 帶 userA → 只看到 userA 的訂單
- [ ] 用 userB 登入後 `GET /api/orders/` → **看不到** userA 的訂單
- [ ] userB 直接 `GET /api/orders/{userA的訂單id}/` → **404**（看不到別人的）
- [ ] admin `GET /api/orders/` → 看得到所有人的訂單
- [ ] `GET /api/orders/items/` 帶 userA → 只看到自己訂單的項目

---

## 4. 付款（payments）— mock 金流

> 先用 userA 建一張訂單，記下 order id。

- [ ] `POST /api/payments/` 不帶 token → **401**
- [ ] 帶 userA token，body `{"order": <userA的訂單id>, "provider": "mock"}` → **201**
- [ ] 回傳 `status` = `success`、有 `transaction_id`（mock_ 開頭）、`amount` = 訂單總價 → 確認
- [ ] 回去 `GET /api/orders/{該訂單id}/`，`status` 應變成 `paid` → 確認

### 邊界 / 負向
- [ ] 同一張訂單**再付一次** → **400**（「這筆訂單已經付款過了」，OneToOne 擋下）
- [ ] userB 嘗試付 **userA 的訂單** → **400**（「這不是你的訂單」）
- [ ] `order` 給不存在的 id → **400**
- [ ] `GET /api/payments/` 帶 userA → 只看到自己的付款；userB 看不到 userA 的

---

## 5. 權限總表（快速回歸用）

| 操作 | 匿名 | userA | userB(別人) | admin |
|------|------|-------|-------------|-------|
| 看商品列表 | ✅ | ✅ | ✅ | ✅ |
| 新增/改/刪商品 | 401 | 403 | 403 | ✅ |
| 建立訂單 | 401 | ✅ | ✅ | ✅ |
| 看 A 的訂單 | 401 | ✅(自己) | 404 | ✅ |
| 付 A 的訂單 | 401 | ✅ | 400 | ✅ |
| 看使用者列表 | 401 | 只有自己 | 只有自己 | 全部 |

---

## 6. 文件 / 整體
- [ ] `/swagger/` 四個 app 的端點都正確列出
- [ ] `/redoc/` 也打得開
- [ ] `/swagger.json` 回得出 JSON（regex 修正後應正常）

---

### 備註
- 金流目前是 mock，永遠成功。若要測「付款失敗」情境，把 `payments/serializers.py` 裡 `success = True` 暫時改成 `False`，預期：payment.status=`failed` 且訂單狀態**不會**變 paid。
- 之後接 Stripe 測試模式後，這份清單的第 4 節要補上「卡號 4242…成功 / 4000…失敗」等測試卡情境。
