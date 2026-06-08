# candidate-pool 規格

## 目標

定義目前候選地點池的管理行為，這些地點尚未進入正式日程。

## Requirements

### Requirement: 使用者 SHALL 可以建立與編輯候選項目

#### Scenario: 建立候選項目

- WHEN 使用者開啟額外行程表單並儲存有效資料
- THEN 系統 SHALL 在 `travel_extra` 建立新資料

#### Scenario: 編輯候選項目

- WHEN 使用者編輯既有候選項目並儲存
- THEN 系統 SHALL 更新對應的 `travel_extra` 資料

### Requirement: 使用者 SHALL 可以刪除候選項目

#### Scenario: 刪除候選項目

- WHEN 使用者確認刪除額外行程項目
- THEN 系統 SHALL 刪除對應的 `travel_extra` 資料

### Requirement: 候選項目 SHALL 關聯到旅程或 legacy context

#### Scenario: 候選項目關聯目前旅程

- WHEN 候選項目是在某趟旅程內建立
- THEN 該項目 SHALL 關聯到目前旅程
- UNLESS 目前旅程是 legacy context

### Requirement: 使用者 SHALL 可以把正式日程移到候選池

#### Scenario: 將正式日程移到候選池

- WHEN 使用者把某筆正式日程移到候選池
- THEN 系統 SHALL 建立對應的 `travel_extra` 資料
- AND 原本的 `travel_schedule` 資料 SHALL 被刪除

### Requirement: 使用者 SHALL 可以把候選項目加入特定旅程日

#### Scenario: 指派候選項目到某一天

- WHEN 使用者為候選項目選擇某個旅程日
- THEN 系統 SHALL 建立新的 `travel_schedule` 資料
- AND 該候選項目 SHALL 被標記為已加入正式日程

### Requirement: 系統 SHALL 支援候選地址重複檢查

#### Scenario: 偵測重複地址

- WHEN 使用者送出的地址已存在於相關候選池中
- THEN 系統 SHALL 能在儲存前辨識這個重複條件
