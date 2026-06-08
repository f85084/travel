export const createTripsModule = ({
  refs,
  deps,
}) => {
  const {
    allTrips,
    allSchedules,
    currentTrip,
    currentDay,
    currentTag,
    tripFilter,
    isTripModalOpen,
    isEditingTrip,
    tripForm,
    showTripImage,
    showExtraView,
    submitting,
    isUserControlled,
    imageModalUrl,
    loading,
  } = refs;

  const {
    computed,
    db,
    storage,
    setDoc,
    updateDoc,
    doc,
    writeBatch,
    storageRef,
    deleteObject,
    showAlert,
    showConfirm,
    isTripExpired,
  } = deps;

  let tripImageTimer = null;

  const getTripImageUrl = (trip) => trip.imageUrl || trip.imageBase64 || null;

  const filteredTripsList = computed(() => {
    if (tripFilter.value === "all") {
      return allTrips.value;
    }
    return allTrips.value.filter((trip) => !isTripExpired(trip));
  });

  const hasLegacyData = computed(() =>
    allSchedules.value.some((item) => !item.tripId),
  );

  const selectTrip = (trip) => {
    currentTrip.value = trip;
    currentDay.value = "all";
    currentTag.value = "全部";
    showExtraView.value = false;

    showTripImage.value = true;
    isUserControlled.value = false;

    if (tripImageTimer) {
      clearTimeout(tripImageTimer);
    }

    tripImageTimer = setTimeout(() => {
      showTripImage.value = false;
    }, 3000);
  };

  const selectLegacyTrip = () => {
    currentTrip.value = {
      id: "legacy",
      name: "未分類行程",
      startDate: "2024-01-01",
      endDate: "2024-01-03",
    };
    currentDay.value = "all";
    currentTag.value = "全部";
    showExtraView.value = false;
  };

  const openTripModal = () => {
    isEditingTrip.value = false;
    tripForm.value = {
      id: null,
      name: "",
      startDate: "",
      endDate: "",
      imageUrl: "",
      imageBase64: "",
      imageFile: null,
      url: "",
    };
    isTripModalOpen.value = true;
  };

  const openEditTripModal = (trip) => {
    isEditingTrip.value = true;
    tripForm.value = {
      ...trip,
      imageUrl: trip.imageUrl || "",
      imageBase64: trip.imageBase64 || "",
      imageFile: null,
    };
    isTripModalOpen.value = true;
  };

  const closeTripModal = () => {
    isTripModalOpen.value = false;
  };

  const openImageModal = (url) => {
    imageModalUrl.value = url;
  };

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showAlert("請選擇圖片檔案", "error");
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      showAlert("圖片大小不能超過 5MB", "error");
      event.target.value = "";
      return;
    }

    tripForm.value.imageFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      tripForm.value.imageUrl = e.target?.result || "";
    };
    reader.onerror = () => {
      showAlert("圖片讀取失敗", "error");
      event.target.value = "";
    };
    reader.readAsDataURL(file);
  };

  const submitTrip = async (user) => {
    if (!user?.value) return;

    const start = new Date(tripForm.value.startDate);
    const end = new Date(tripForm.value.endDate);
    if (start > end) {
      showAlert("結束日期必須在開始日期之後", "error");
      return;
    }

    submitting.value = true;
    try {
      let imageBase64 = tripForm.value.imageBase64 || "";
      let imageUrl = tripForm.value.imageUrl || "";

      if (tripForm.value.imageFile instanceof File) {
        try {
          imageBase64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error("圖片讀取失敗"));
            reader.readAsDataURL(tripForm.value.imageFile);
          });
          imageUrl = "";
        } catch (error) {
          console.error("Image conversion error:", error);
          showAlert(error.message || "圖片轉換失敗", "error");
          submitting.value = false;
          return;
        }
      }

      const tripData = {
        name: tripForm.value.name.trim(),
        startDate: tripForm.value.startDate,
        endDate: tripForm.value.endDate,
        imageUrl,
        imageBase64,
        url: tripForm.value.url.trim(),
        updatedAt: Date.now(),
      };

      if (isEditingTrip.value && tripForm.value.id) {
        await updateDoc(doc(db, "travel", tripForm.value.id), tripData);
      } else {
        const newId = String(Date.now());
        await setDoc(doc(db, "travel", newId), {
          ...tripData,
          id: newId,
          createdAt: Date.now(),
        });
      }

      closeTripModal();
      showAlert("保存成功！", "success");
    } catch (e) {
      console.error("Save error:", e);
      showAlert(`儲存失敗：${e.message || "未知錯誤"}`, "error");
    } finally {
      submitting.value = false;
    }
  };

  const confirmDeleteTrip = async (trip) => {
    const result = await showConfirm(
      `確定要刪除「${trip.name}」嗎？裡面的行程也會一併刪除喔！`,
    );
    if (!result) return;

    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, "travel", trip.id));

      const relatedSchedules = allSchedules.value.filter(
        (schedule) => schedule.tripId === trip.id,
      );
      relatedSchedules.forEach((schedule) => {
        batch.delete(doc(db, "travel_schedule", schedule.id));
      });

      await batch.commit();

      if (trip.imageUrl) {
        try {
          const imageRef = storageRef(storage, `trip-images/${trip.id}`);
          await deleteObject(imageRef).catch(() => {});
        } catch {}
      }
    } catch (e) {
      showAlert("刪除失敗", "error");
    }
  };

  const setTrips = (trips) => {
    allTrips.value = trips;
  };

  const markTripsLoaded = () => {
    loading.value = false;
  };

  return {
    filteredTripsList,
    hasLegacyData,
    getTripImageUrl,
    selectTrip,
    selectLegacyTrip,
    openTripModal,
    openEditTripModal,
    closeTripModal,
    openImageModal,
    handleImageUpload,
    submitTrip,
    confirmDeleteTrip,
    setTrips,
    markTripsLoaded,
  };
};
