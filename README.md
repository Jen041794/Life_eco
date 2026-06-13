# Life_eco 電商平台

一個前後端分離的全端電商專案，包含 **顧客端 API** 與 **React 後台管理系統**。
重點放在「乾淨的 API 設計 + 完整的自動化測試 + 角色權限控管」，呈現具備測試思維的後端開發能力。

> 作者：**Michelle**　|　這是一個學習與作品集專案，開發過程有借助 AI 工具輔助。

---

## ✨ 主要功能

### 顧客端 API
- 會員註冊 / 登入（JWT 認證）
- 商品瀏覽、關鍵字搜尋、分頁
- 購物車一次成立訂單（自動計算總價、扣庫存、價格快照、交易整筆回滾）
- 模擬金流付款（mock，已預留 Stripe 測試模式接口）
- 查詢自己的訂單與付款

### 後台管理（React）
- 管理員登入（驗證 `is_staff`）
- 📊 **儀表板**：總訂單 / 營收 / 會員數 / 低庫存提醒
- 📦 **商品管理**：新增 / 編輯 / 刪除、搜尋、分頁、**多圖上傳（最多 3 張）**
- 📋 **訂單管理**：狀態篩選、客人搜尋、查看明細、推進狀態（出貨 / 完成）、取消（自動回補庫存 + 退款）
- 👥 **會員管理**：編輯 Email、啟用 / 停用帳號

---

## 🛠️ 技術棧

| 範疇 | 技術 |
|------|------|
| 後端 | Python、Django、Django REST Framework |
| 認證 | JWT（djangorestframework-simplejwt） |
| 資料庫 | MySQL（Django ORM） |
| API 文件 | drf-yasg（Swagger / ReDoc） |
| 前端 | React、Vite、React Router、Redux Toolkit + RTK Query、Bootstrap |
| 測試 | Django `APITestCase`（58 個測試） |

---

## 📁 專案結構

```
Life_eco/
├── ecommerce/            # Django 後端
│   ├── products/         # 商品（含商品圖片）
│   ├── orders/           # 訂單、訂單項目
│   ├── payments/         # 付款（mock 金流）
│   ├── user/             # 會員、註冊 / 登入
│   ├── dashboard/        # 後台統計 API
│   ├── ecommerce/        # 專案設定
│   └── manage.py
├── frontend/             # React 後台管理
│   └── src/
│       ├── features/     # RTK Query API 層、auth
│       ├── pages/        # 各管理頁
│       └── components/   # 共用元件
├── requirements.txt
└── README.md
```

---

## 🚀 本地執行

### 1. 後端

需先安裝並啟動 MySQL，建立資料庫 `ecommerce_db`。

```bash
cd ecommerce
python -m venv ../venv
../venv/Scripts/activate        # Windows
pip install -r ../requirements.txt

# 設定環境變數：複製範本後填入自己的值
cp .env.example .env            # 再編輯 .env

python manage.py migrate
python manage.py createsuperuser
python manage.py runserver       # http://127.0.0.1:8000
```

環境變數（`.env`）：

| 變數 | 說明 |
|------|------|
| `DJANGO_SECRET_KEY` | Django 金鑰 |
| `DJANGO_DEBUG` | `True` / `False` |
| `DB_NAME` / `DB_USER` / `DB_PASSWORD` / `DB_HOST` / `DB_PORT` | MySQL 連線 |
| `STRIPE_SECRET_KEY` | Stripe 測試金鑰（之後串金流用） |

### 2. 前端

```bash
cd frontend
npm install
npm run dev                      # http://localhost:5173
```

---

## 🧪 測試

```bash
cd ecommerce
python manage.py test
```

涵蓋權限邊界（匿名 / 一般會員 / 管理員）、訂單庫存回滾、越權存取、密碼保護、狀態流轉、圖片上傳上限等。

## 📖 API 文件

啟動後端後：
- Swagger UI：http://127.0.0.1:8000/swagger/
- ReDoc：http://127.0.0.1:8000/redoc/

---

## 📌 備註
- 金流目前為 mock（模擬一律成功），程式內已標好串接 Stripe 測試模式的位置。
- 上傳的商品圖片存於本機 `media/`（開發用），正式環境建議改用雲端儲存。
