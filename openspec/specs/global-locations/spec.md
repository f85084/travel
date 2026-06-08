# global-locations 規格

## 目標

定義目前跨旅程檢視候選地點的行為。

## Requirements

### Requirement: 使用者 SHALL 可以從首頁進入全部地點模式

#### Scenario: 切換到全部地點模式

- WHEN 使用者選擇 `locations` 旅程篩選
- THEN 系統 SHALL 顯示全部地點檢視

### Requirement: 全部地點模式 SHALL 顯示跨旅程的候選地點

#### Scenario: 顯示地點卡片

- WHEN 全部地點模式啟用
- THEN 系統 SHALL 把額外候選項目顯示成地點卡片

### Requirement: 使用者 SHALL 可以搜尋全部地點

#### Scenario: 依文字搜尋

- WHEN 使用者輸入搜尋字串
- THEN 系統 SHALL 依地點名稱、地址或備註篩選地點

### Requirement: 使用者 SHALL 可以依分類篩選全部地點

#### Scenario: 依分類篩選

- WHEN 使用者選擇分類
- THEN 系統 SHALL 只顯示符合該分類的地點

### Requirement: 全部地點模式 SHALL 提供快速外部操作

#### Scenario: 開啟地圖

- WHEN 地點具有地址資訊
- THEN UI SHALL 允許使用者開啟 Google Maps 搜尋

#### Scenario: 開啟外部連結

- WHEN 地點具有 URL
- THEN UI SHALL 允許使用者開啟外部網站連結
