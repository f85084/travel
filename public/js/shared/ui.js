export const showAlert = (message, type = "info") => {
  const { ElMessage } = window.ElementPlus;
  ElMessage({
    message,
    type:
      type === "error" ? "error" : type === "success" ? "success" : "info",
  });
};

export const showConfirm = (message) => {
  const { ElMessageBox } = window.ElementPlus;
  return ElMessageBox.confirm(message, "確認", {
    confirmButtonText: "確認刪除",
    cancelButtonText: "取消",
    type: "warning",
  }).then(
    () => true,
    () => false,
  );
};
