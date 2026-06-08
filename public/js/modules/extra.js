export const createExtraModule = ({
  refs,
  deps,
}) => {
  const {
    allExtraSchedules,
    allSchedules,
    currentTrip,
    currentDay,
    currentTag,
    showExtraView,
    showGlobalExtra,
    extraSearchQuery,
    extraSearchTag,
    isEditing,
    isModalOpen,
    form,
    user,
    submitting,
  } = refs;

  const {
    computed,
    db,
    doc,
    setDoc,
    updateDoc,
    deleteDoc,
    showAlert,
  } = deps;

  const applyExtraFilters = (items) => {
    let data = [...items];

    if (extraSearchQuery.value.trim()) {
      const query = extraSearchQuery.value.toLowerCase();
      data = data.filter((item) => {
        return (
          item.activity.toLowerCase().includes(query) ||
          (item.address || "").toLowerCase().includes(query) ||
          (item.note || "").toLowerCase().includes(query)
        );
      });
    }

    if (extraSearchTag.value) {
      data = data.filter((item) => item.tag === extraSearchTag.value);
    }

    return data.sort((a, b) => {
      const orderA = a.order ?? Infinity;
      const orderB = b.order ?? Infinity;
      if (orderA !== orderB) return orderA - orderB;
      return (a.bookingTime || "99:99").localeCompare(b.bookingTime || "99:99");
    });
  };

  const filteredExtraData = computed(() => {
    if (!currentTrip.value && !showGlobalExtra.value) return [];

    const showAll = currentTag.value === "全部";
    let data = [];

    if (showGlobalExtra.value) {
      data = allExtraSchedules.value.filter((item) => {
        return showAll || item.tag === currentTag.value;
      });
    } else {
      const targetTripId = currentTrip.value.id;
      const isLegacy = targetTripId === "legacy";

      data = allExtraSchedules.value.filter((item) => {
        const isTripMatch = isLegacy
          ? !item.tripId
          : item.tripId === targetTripId;
        if (!isTripMatch) return false;
        if (item.usedInSchedule) return false;
        return showAll || item.tag === currentTag.value;
      });
    }

    return applyExtraFilters(data);
  });

  const filteredLocationData = computed(() =>
    applyExtraFilters(allExtraSchedules.value),
  );

  const openAddExtraModal = () => {
    isEditing.value = false;
    form.value = {
      id: null,
      isExtra: true,
      day:
        currentDay.value === "all" || !currentDay.value
          ? "1"
          : currentDay.value,
      activity: "",
      tag: "景點",
      bookingTime: "",
      address: "",
      note: "",
      url: "",
      businessHours: "",
    };
    isModalOpen.value = true;
  };

  const openEditExtraModal = (item) => {
    isEditing.value = true;
    form.value = {
      id: item.id,
      isExtra: true,
      day: item.day || "1",
      activity: item.activity || "",
      tag: item.tag || "景點",
      bookingTime: item.bookingTime || "",
      address: item.address || "",
      note: item.note || "",
      url: item.url || "",
      businessHours: item.businessHours || "",
    };
    isModalOpen.value = true;
  };

  const findDuplicateAddressInExtra = (address) => {
    if (!address || !address.trim()) return null;
    const trimmedAddress = address.trim().toLowerCase();

    if (showGlobalExtra.value) {
      return allExtraSchedules.value.find(
        (item) =>
          item.address &&
          item.address.trim().toLowerCase() === trimmedAddress,
      );
    }

    if (!currentTrip.value) return null;

    const targetTripId = currentTrip.value.id;
    const isLegacy = targetTripId === "legacy";
    return allExtraSchedules.value.find((item) => {
      const isTripMatch = isLegacy ? !item.tripId : item.tripId === targetTripId;
      return (
        isTripMatch &&
        item.address &&
        item.address.trim().toLowerCase() === trimmedAddress
      );
    });
  };

  const moveToExtra = async (item) => {
    if (!user.value || !item.id) return;

    try {
      submitting.value = true;

      const currentExtraItems = filteredExtraData.value;
      const newOrder =
        currentExtraItems.length > 0
          ? Math.max(...currentExtraItems.map((i) => i.order ?? 0)) + 1
          : 0;

      const newExtraItem = {
        activity: item.activity,
        tag: item.tag,
        bookingTime: item.bookingTime || "",
        address: item.address || "",
        note: item.note || "",
        url: item.url || "",
        businessHours: item.businessHours || "",
        tripId: item.tripId,
        order: newOrder,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const newId = String(Date.now());
      await setDoc(doc(db, "travel_extra", newId), {
        ...newExtraItem,
        id: newId,
      });

      await deleteDoc(doc(db, "travel_schedule", item.id));
      showAlert("已移至額外行程", "success");
    } catch (e) {
      console.error("Move to extra error:", e);
      showAlert(`移動失敗：${e.message || "未知錯誤"}`, "error");
    } finally {
      submitting.value = false;
    }
  };

  const moveToDay = async (item, event) => {
    const dayNum = event.target.value;
    if (!user.value || !item.id || !dayNum) return;

    try {
      submitting.value = true;

      const currentDayItems = allSchedules.value.filter(
        (schedule) =>
          schedule.tripId === item.tripId &&
          String(schedule.day) === String(dayNum),
      );
      const newOrder =
        currentDayItems.length > 0
          ? Math.max(...currentDayItems.map((i) => i.order ?? 0)) + 1
          : 0;

      const newScheduleItem = {
        activity: item.activity,
        tag: item.tag,
        bookingTime: item.bookingTime || "",
        address: item.address || "",
        note: item.note || "",
        url: item.url || "",
        businessHours: item.businessHours || "",
        tripId: item.tripId,
        day: String(dayNum),
        order: newOrder,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const newId = String(Date.now());
      await setDoc(doc(db, "travel_schedule", newId), {
        ...newScheduleItem,
        id: newId,
      });

      await updateDoc(doc(db, "travel_extra", item.id), {
        usedInSchedule: true,
        updatedAt: Date.now(),
      });

      event.target.value = "";
      showAlert(`已加到 Day ${dayNum}`, "success");
      currentDay.value = String(dayNum);
      showExtraView.value = false;
    } catch (e) {
      console.error("Move to day error:", e);
      showAlert(`移動失敗：${e.message || "未知錯誤"}`, "error");
    } finally {
      submitting.value = false;
    }
  };

  const setExtraSchedules = (extraSchedules) => {
    allExtraSchedules.value = extraSchedules;
  };

  return {
    filteredExtraData,
    filteredLocationData,
    openAddExtraModal,
    openEditExtraModal,
    findDuplicateAddressInExtra,
    moveToExtra,
    moveToDay,
    setExtraSchedules,
  };
};
