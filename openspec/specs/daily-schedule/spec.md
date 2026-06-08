# daily-schedule 規格

## 目標

定義目前單一旅程中的正式日程顯示與管理行為。

## Requirements

### Requirement: 使用者 SHALL 可以進入單一旅程檢視

#### Scenario: 從首頁選擇旅程

- WHEN 使用者點選旅程卡片
- THEN 系統 SHALL 進入旅程詳細頁
- AND 目前天數 SHALL 初始化為 Day 1
- AND 目前分類篩選 SHALL 初始化為 `全部`

### Requirement: 系統 SHALL 依旅程日期推導天數

#### Scenario: 建立旅程日切換

- WHEN 選定旅程具有有效開始與結束日期
- THEN 系統 SHALL 依日期區間計算天數
- AND 每一天 SHALL 作為可切換的日標籤

### Requirement: 使用者 SHALL 可以管理正式日程項目

#### Scenario: 建立正式日程

- WHEN 使用者送出有效的正式日程表單
- THEN 系統 SHALL 在 `travel_schedule` 建立新資料
- AND 新項目 SHALL 關聯到目前旅程

#### Scenario: 編輯正式日程

- WHEN 使用者編輯正式日程並儲存
- THEN 系統 SHALL 更新對應的 `travel_schedule` 資料

#### Scenario: 刪除正式日程

- WHEN 使用者確認刪除正式日程
- THEN 系統 SHALL 刪除對應的 `travel_schedule` 資料

### Requirement: 使用者 SHALL 可以篩選正式日程

#### Scenario: 依天數篩選

- WHEN 使用者選擇某一天
- THEN 系統 SHALL 只顯示該天的正式日程項目

#### Scenario: 依分類篩選

- WHEN 使用者選擇分類篩選
- THEN 系統 SHALL 只顯示該分類的正式日程項目

### Requirement: 使用者 SHALL 可以重新排序正式日程

#### Scenario: 拖曳正式日程項目

- WHEN 使用者拖曳正式日程到新位置
- THEN 系統 SHALL 更新畫面中的順序
- AND 新順序 SHALL 被寫回 Firestore

### Requirement: 正式日程項目 SHALL 支援地點相關資訊

#### Scenario: 顯示正式日程細節

- WHEN 正式日程項目顯示在畫面上
- THEN 它 MAY 包含分類、時間、地址、備註、外部連結與營業時間
