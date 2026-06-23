#!/usr/bin/env bash
# Render 部署用的 build 腳本：安裝套件 → 收集靜態檔 → 套用資料庫 migration
# 對應 Render 服務設定的 Build Command：./build.sh
set -o errexit

pip install -r requirements.txt
python ecommerce/manage.py collectstatic --no-input
python ecommerce/manage.py migrate
