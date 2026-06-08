# trip-management 規格

## 目標

定義目前旅程建立、顯示、編輯與刪除的行為。

## Requirements

### Requirement: 使用者 SHALL 能在首頁瀏覽旅程列表

#### Scenario: 預設顯示即將出發旅程

- WHEN 應用程式成功載入
- THEN 首頁 SHALL 顯示旅程列表
- AND 預設旅程篩選 SHALL 為 `upcoming`

#### Scenario: 切換旅程列表模式

- WHEN 使用者切換旅程篩選
- THEN 系統 SHALL 支援在即將出發、全部旅程與全部地點模式之間切換

### Requirement: 系統 SHALL 區分已結束旅程與進行中旅程

#### Scenario: 標記已結束旅程

- WHEN 旅程結束日期早於目前日期
- THEN 該旅程 SHALL 被視為已結束
- AND 旅程卡片 SHALL 在視覺上與進行中旅程區分

#### Scenario: 即將出發模式排除已結束旅程

- WHEN 目前旅程篩選為 `upcoming`
- THEN 已結束旅程 SHALL 不出現在主要旅程列表中

### Requirement: 使用者 SHALL 可以建立與編輯旅程資料

#### Scenario: 建立新旅程

- WHEN 使用者開啟旅程表單並送出有效資料
- THEN 系統 SHALL 在 Firestore 建立新的旅程資料

#### Scenario: 編輯既有旅程

- WHEN 使用者開啟旅程編輯模式並儲存變更
- THEN 系統 SHALL 更新 Firestore 中對應的旅程資料

### Requirement: 使用者 SHALL 可以刪除旅程

#### Scenario: 刪除旅程與關聯資料

- WHEN 使用者確認刪除旅程
- THEN 系統 SHALL 刪除旅程資料
- AND 系統 SHALL 刪除相關正式行程資料
- AND 系統 SHALL 刪除相關候選地點資料

### Requirement: 旅程 MAY 包含關聯圖片

#### Scenario: 預覽上傳的旅程圖片

- WHEN 使用者為旅程選擇圖片檔案
- THEN 系統 SHALL 驗證檔案型別與大小
- AND 系統 SHALL 在儲存前提供預覽

#### Scenario: 在旅程卡片顯示旅程圖片

- WHEN 旅程具有圖片 URL 或已儲存的圖片資料
- THEN 旅程卡片 SHALL 顯示該圖片
