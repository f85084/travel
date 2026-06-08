# place-enrichment 規格

## 目標

定義目前透過 Google Places 補齊地點資訊的行為。

## Requirements

### Requirement: 系統 SHALL 支援地址 autocomplete

#### Scenario: 顯示預測建議

- WHEN 使用者在表單中輸入地址
- THEN 系統 SHALL 向 Google Places 取得 autocomplete 建議
- AND UI SHALL 顯示有限數量的候選結果

### Requirement: 系統 SHALL 支援選取 autocomplete 建議

#### Scenario: 選擇建議項目

- WHEN 使用者選擇某個 autocomplete 建議
- THEN 系統 SHALL 記錄選取的 place id
- AND 地址欄位 SHALL 被更新
- AND 系統 SHALL 嘗試取得該地點的詳細資訊

### Requirement: 系統 SHALL 嘗試自動補齊地點細節

#### Scenario: 解析地點詳細資訊

- WHEN place id 或可用查詢條件可被解析
- THEN 系統 SHALL 嘗試取得地點名稱與營業時間

#### Scenario: 使用補齊後的名稱

- WHEN 回傳的地點名稱看起來比原始地址更適合作為地點名稱
- THEN 系統 MAY 用該名稱補強活動名稱欄位

### Requirement: 系統 SHALL 快取重複地點查詢

#### Scenario: 使用快取的營業時間

- WHEN 同一地址在目前 session 中已查過
- THEN 系統 SHALL 重用快取的營業時間，而不是再次查詢

### Requirement: 地點補齊 SHALL 以可容錯方式失敗

#### Scenario: 找不到地點詳細資訊

- WHEN Google Places 無法解析輸入內容
- THEN 系統 SHALL 保持表單仍可使用
- AND 不得因查詢失敗而阻止使用者儲存

#### Scenario: 沒有營業時間資料

- WHEN Google Places 有回傳地點但沒有營業時間
- THEN 系統 SHALL 保留查詢結果
- AND 不得把這種情況視為致命錯誤
