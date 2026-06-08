export const createScheduleModule = ({
  refs,
  deps,
}) => {
  const {
    allSchedules,
    currentTrip,
    currentDay,
    currentTag,
    sortableList,
  } = refs;

  const {
    computed,
    watch,
    nextTick,
    db,
    writeBatch,
    doc,
  } = deps;

  let sortableInstance = null;

  const filteredData = computed(() => {
    if (!currentTrip.value) return [];

    const targetTripId = currentTrip.value.id;
    const isLegacy = targetTripId === "legacy";
    const currentDayStr = String(currentDay.value);
    const showAll = currentTag.value === "全部";
    const showAllDays = currentDayStr === "all";

    const data = allSchedules.value.filter((item) => {
      if (!showAllDays && String(item.day) !== currentDayStr) return false;

      const isTripMatch = isLegacy ? !item.tripId : item.tripId === targetTripId;
      if (!isTripMatch) return false;

      return showAll || item.tag === currentTag.value;
    });

    return data.sort((a, b) => {
      const orderA = a.order ?? Infinity;
      const orderB = b.order ?? Infinity;
      if (orderA !== orderB) return orderA - orderB;
      return (a.bookingTime || "99:99").localeCompare(b.bookingTime || "99:99");
    });
  });

  const tripDays = computed(() => {
    if (
      !currentTrip.value ||
      !currentTrip.value.startDate ||
      !currentTrip.value.endDate
    ) {
      return [];
    }

    const start = new Date(currentTrip.value.startDate);
    const end = new Date(currentTrip.value.endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
      return [];
    }

    const weekDays = ["日", "一", "二", "三", "四", "五", "六"];
    const days = [];
    const current = new Date(start);
    let dayNum = 1;
    const maxDays = 365;

    while (current <= end && dayNum <= maxDays) {
      const dayOfWeek = weekDays[current.getDay()];
      days.push({
        num: dayNum,
        dateDisplay: `${current.getMonth() + 1}/${current.getDate()} (${dayOfWeek})`,
      });
      current.setDate(current.getDate() + 1);
      dayNum++;
    }

    return days;
  });

  watch([filteredData, currentDay, currentTag], async () => {
    await nextTick();
    if (!sortableList.value) return;

    if (sortableInstance) sortableInstance.destroy();
    sortableInstance = new Sortable(sortableList.value, {
      handle: ".handle",
      animation: 150,
      ghostClass: "sortable-ghost",
      dragClass: "sortable-drag",
      onEnd: async (evt) => {
        if (evt.newIndex === evt.oldIndex) return;

        const newOrderIds = Array.from(sortableList.value.children).map((el) =>
          el.getAttribute("data-id"),
        );
        const batch = writeBatch(db);
        newOrderIds.forEach((id, index) => {
          if (!id) return;
          const ref = doc(db, "travel_schedule", id);
          batch.update(ref, { order: index });
        });

        try {
          await batch.commit();
        } catch (e) {
          console.error("Sort error", e);
        }
      },
    });
  });

  const setSchedules = (schedules) => {
    allSchedules.value = schedules;
  };

  return {
    filteredData,
    tripDays,
    setSchedules,
  };
};
