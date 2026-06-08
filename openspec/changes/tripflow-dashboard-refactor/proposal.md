# 變更提案：tripflow-dashboard-refactor

## Why

目前 travel 專案其實已經支援可用的旅遊規劃流程，但不容易延伸，也不容易包裝成成熟產品。

主要問題有：

- 核心 UI 與邏輯過度集中在 `public/index.html` 與 `public/js/app.js`
- 首頁體驗比較像列表，不像規劃 dashboard
- 正式行程與候選地點在產品層級上不夠清楚
- 後續迭代成本高，因為視圖邏輯、表單邏輯、Firestore 邏輯與 Google Places 邏輯混在一起

## What Changes

這次變更要做的是 TripFlow 的結構重整與成品化整理。

這次變更會：

- 依責任拆分目前的程式邏輯
- 把首頁往 dashboard 式旅程總覽調整
- 更清楚定義正式行程與候選地點的產品差異
- 在不重寫核心行為的前提下，降低未來 UI 與互動改版成本

## Impact

### Affected Specs

- trip-management
- daily-schedule
- candidate-pool
- global-locations
- place-enrichment

### Affected Code

- `public/index.html`
- `public/js/app.js`
- `public/css/styles.css`
- `public/js/core/` 下的新檔案
- `public/js/modules/` 下的新檔案
- `public/js/integrations/` 下的新檔案
- `public/js/shared/` 下的新檔案

### Risk Notes

- 重構過程中必須保持既有功能可用
- 這次不處理登入與權限模型
- 這次優先處理結構與產品層級清晰度，不先做大規模視覺重設
