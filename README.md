# Trip Planner

一個以「多天旅程規劃」為核心的前端工具，讓使用者可以集中管理旅程、每日行程、候選地點與補充資訊，而不是只做一張靜態行程表。

目前這個專案已經具備可 demo 的產品雛形，重點在於：

- 管理多個旅程
- 切換單一旅程後查看每日行程
- 拖曳調整當天項目順序
- 維護候選地點與額外備案
- 透過 Google Places 自動補地址與營業資訊
- 使用 Firebase 即時同步資料

## 產品定位

這不是旅遊資訊站，也不是單純記事本式行程表。

它比較像一個 `旅行規劃工作台`：

- 首頁整理所有旅程
- 單一旅程頁負責安排每天節奏
- 額外行程區負責存放還沒決定要不要排進正式行程的候選點
- 全部地點模式則提供跨旅程搜尋與整理

如果之後要往面試成品方向打磨，這個專案很適合包裝成：

`TripFlow | Smart Travel Planning Dashboard`

## 目前功能

### 1. 旅程管理

- 新增、編輯、刪除旅程
- 支援旅程名稱、日期、圖片
- 首頁可切換：
  - 即將出發
  - 全部旅程
  - 全部地點
- 已結束旅程會自動區分顯示

### 2. 每日行程規劃

- 進入旅程後依天數切換 Day 1、Day 2...
- 每個行程項目可包含：
  - 分類
  - 時間
  - 地點名稱
  - 地址
  - 備註
  - 外部連結
  - 營業時間
- 支援拖曳排序，調整當日順序後直接寫回 Firestore

### 3. 額外行程 / 候選地點

- 可建立尚未排入正式日程的候選項目
- 可從正式行程移到額外行程
- 也可以從額外行程指定加入某一天
- 適合放備案、待選餐廳、還沒決定的景點

### 4. 全部地點檢視

- 跨旅程查看所有額外地點
- 支援搜尋名稱、地址、備註
- 支援分類篩選
- 可快速跳轉 Google Maps 或外部網址

### 5. Google Places 整合

- 輸入地址時提供 autocomplete
- 嘗試自動補上地點名稱與營業時間
- 有簡單快取，避免重複查詢

### 6. Firebase 即時同步

- 使用 Firebase Authentication 匿名登入
- 使用 Firestore 儲存旅程、每日行程、額外行程
- 畫面透過 `onSnapshot` 即時同步資料

## 技術實作

### 前端

- Vue 3（CDN 版本）
- Element Plus
- Tailwind CSS（CDN）
- SortableJS
- Font Awesome

### 後端 / 雲端服務

- Firebase Authentication
- Cloud Firestore
- Firebase Hosting
- Google Maps Places API

### 開發方式

雖然專案使用 Vite 啟動，但目前不是 SFC / bundler-heavy 架構，而是：

- `public/index.html` 放主要畫面與大量模板
- `public/js/app.js` 放 Vue 邏輯
- `public/css/styles.css` 放樣式補充
- `public/config.js` 放 Firebase 設定

也就是說，這是一個 `以 Vite 當本機開發伺服器的 CDN 型前端專案`。

## 專案結構

```text
travel/
├─ public/
│  ├─ index.html          # 主畫面與 Vue template
│  ├─ config.js           # Firebase / Google Maps 設定
│  ├─ css/
│  │  └─ styles.css       # 自訂樣式
│  └─ js/
│     └─ app.js           # 核心互動邏輯
├─ firebase.json          # Hosting 設定
├─ firestore.rules        # Firestore 規則
├─ vite.config.js         # Vite root/build 設定
└─ package.json
```

## 資料模型

目前主要使用三組 Firestore collection：

- `travel`
  - 旅程主資料
- `travel_schedule`
  - 正式日程項目
- `travel_extra`
  - 額外候選地點 / 備案

大致上可以這樣理解：

- 一個 `travel` 對應一趟旅程
- 多筆 `travel_schedule` 透過 `tripId` 掛到該旅程，並用 `day`、`order` 管理排序
- 多筆 `travel_extra` 也透過 `tripId` 掛到該旅程，作為候選池

## 本機啟動

先安裝依賴：

```bash
npm install
```

啟動開發伺服器：

```bash
npm run dev
```

預設會使用：

- `http://localhost:5173`

## 打包

```bash
npm run build
```

輸出會放到：

- `dist/`

## 部署

目前專案已配置 Firebase Hosting。

Hosting 設定重點：

- 靜態根目錄為 `public`
- 所有路由 rewrite 回 `/index.html`

如果要正式部署，建議流程：

```bash
npm run build
firebase deploy
```

不過要注意，目前 `firebase.json` 的 hosting public 指向的是 `public`，不是 `dist`。  
如果之後要把 Vite build 結果作為正式部署輸出，這段設定最好一起調整。

## 目前已知限制

### 1. 設定檔直接放在前端

`public/config.js` 目前直接包含 Firebase / Google Maps 設定。

這對 demo 很方便，但如果往正式產品走，建議至少：

- 把設定移到環境變數管理
- 避免在 repo 中保留不必要的公開設定

### 2. Firestore 規則是 demo 寫法

目前 `firestore.rules` 對 `travel`、`travel_schedule`、`travel_extra` 都是直接開放讀寫。

這適合快速驗證，但不適合正式上線。  
若之後要往真產品走，應改成依登入狀態或使用者 ownership 控管。

### 3. 結構偏單頁快速開發

目前 `index.html` 承載了大量模板，`app.js` 也集中很多邏輯。

優點：

- 迭代快
- demo 容易

缺點：

- 後續擴充時可維護性會下降
- 不利於元件化與測試

## 面試可講的亮點

如果你要把這個專案包裝成面試作品，現在最值得講的不是「旅遊」，而是這幾個設計點：

- 多視角資料管理：旅程列表、單一旅程、候選池、全部地點
- 真實使用情境：正式日程與備案分開管理
- 即時同步：透過 Firestore 讓資料更新直接反映到 UI
- 可操作排序：拖曳調整順序後同步儲存
- 外部資訊整合：Google Places 自動補齊地點資料

## 下一步建議

如果之後要把它升級成更完整的 demo 成品，優先順序我會建議：

1. 重做資訊架構與首頁視覺，往 dashboard 風格靠攏
2. 把「每日行程」和「候選清單」的差異做得更清楚
3. 加入旅程總覽 KPI，例如天數、預約數、候選數、未完成事項
4. 增加風險提示，例如行程過密、距離過遠、營業時間衝突
5. 把大型 `index.html` / `app.js` 拆成可維護的元件結構

## 目前檔案重點

- [public/index.html](D:\Anna\travel\public\index.html)
- [public/js/app.js](D:\Anna\travel\public\js\app.js)
- [public/css/styles.css](D:\Anna\travel\public\css\styles.css)
- [vite.config.js](D:\Anna\travel\vite.config.js)
- [firebase.json](D:\Anna\travel\firebase.json)
- [firestore.rules](D:\Anna\travel\firestore.rules)
