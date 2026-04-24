// src/components/calendar/Calendar.tsx
"use client";

import React, { useState, useRef, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import {
  EventInput,
  DateSelectArg,
  EventClickArg,
  EventContentArg,
} from "@fullcalendar/core";
import { useModal } from "@/hooks/useModal";
import { Modal } from "@/components/ui/modal";

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  extendedProps: { calendar: string };
}

interface CalendarProps {
  company?: string;
}

const Calendar: React.FC<CalendarProps> = ({ company }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [eventTitle, setEventTitle] = useState("");
  const [eventStartDate, setEventStartDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [eventLevel, setEventLevel] = useState("Primary");

  const calendarRef = useRef<FullCalendar>(null);
  const { isOpen, openModal, closeModal } = useModal();

  const calendarsEvents = {
    Danger: "danger",
    Success: "success",
    Primary: "primary",
    Warning: "warning",
  };

  // Load events from localStorage
  useEffect(() => {
    const savedEvents = localStorage.getItem(`${company}-events`);
    if (savedEvents) {
      setEvents(JSON.parse(savedEvents));
    } else {
      // default events
      setEvents([
        { id: "1", title: "Event Conf.", start: new Date().toISOString().split("T")[0], extendedProps: { calendar: "Danger" } },
        { id: "2", title: "Meeting", start: new Date(Date.now() + 86400000).toISOString().split("T")[0], extendedProps: { calendar: "Success" } },
      ]);
    }
  }, [company]);

  // Save events to localStorage
  useEffect(() => {
    localStorage.setItem(`${company}-events`, JSON.stringify(events));
  }, [events, company]);

  const resetModalFields = () => {
    setEventTitle("");
    setEventStartDate("");
    setEventEndDate("");
    setEventLevel("Primary");
    setSelectedEvent(null);
  };

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    resetModalFields();
    setEventStartDate(selectInfo.startStr);
    setEventEndDate(selectInfo.endStr || selectInfo.startStr);
    openModal();
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const event = clickInfo.event;
    const ev: CalendarEvent = {
      id: event.id,
      title: event.title,
      start: event.start?.toISOString().split("T")[0] || "",
      end: event.end?.toISOString().split("T")[0] || event.start?.toISOString().split("T")[0] || "",
      extendedProps: { calendar: event.extendedProps.calendar || "Primary" },
    };
    setSelectedEvent(ev);
    setEventTitle(ev.title);
    setEventStartDate(ev.start);
    setEventEndDate(ev.end || ev.start);
    setEventLevel(ev.extendedProps.calendar);
    openModal();
  };

  const handleAddOrUpdateEvent = () => {
    if (!eventTitle || !eventStartDate) return;

    if (selectedEvent) {
      setEvents((prev) =>
        prev.map((ev) =>
          ev.id === selectedEvent.id
            ? { ...ev, title: eventTitle, start: eventStartDate, end: eventEndDate, extendedProps: { calendar: eventLevel } }
            : ev
        )
      );
    } else {
      const newEvent: CalendarEvent = {
        id: Date.now().toString(),
        title: eventTitle,
        start: eventStartDate,
        end: eventEndDate,
        allDay: true,
        extendedProps: { calendar: eventLevel },
      };
      setEvents((prev) => [...prev, newEvent]);
    }

    closeModal();
    resetModalFields();
  };

  const renderEventContent = (eventInfo: EventContentArg) => {
    const colorClass = `fc-bg-${eventInfo.event.extendedProps.calendar.toLowerCase()}`;
    return (
      <div className={`event-fc-color flex fc-event-main ${colorClass} p-1 rounded-sm`}>
        <div className="fc-daygrid-event-dot"></div>
        <div className="fc-event-time">{eventInfo.timeText}</div>
        <div className="fc-event-title">{eventInfo.event.title}</div>
      </div>
    );
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-4">
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        selectable={true}
        select={handleDateSelect}
        eventClick={handleEventClick}
        events={events}
        eventContent={renderEventContent}
        headerToolbar={{
          left: "prev,next addEventButton",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        customButtons={{
          addEventButton: {
            text: "Add Event +",
            click: openModal,
          },
        }}
      />

      {/* Modal */}
      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] p-6 lg:p-10">
        <div className="flex flex-col gap-4">
          <h2 className="font-semibold text-xl">{selectedEvent ? "Edit Event" : "Add Event"}</h2>

          <input
            type="text"
            placeholder="Event Title"
            value={eventTitle}
            onChange={(e) => setEventTitle(e.target.value)}
            className="border px-3 py-2 rounded w-full"
          />

          <label>Event Color:</label>
          <div className="flex gap-3">
            {Object.keys(calendarsEvents).map((key) => (
              <label key={key} className="flex items-center gap-1">
                <input type="radio" name="event-level" value={key} checked={eventLevel === key} onChange={() => setEventLevel(key)} />
                {key}
              </label>
            ))}
          </div>

          <div className="flex gap-3">
            <div>
              <label>Start Date</label>
              <input type="date" value={eventStartDate} onChange={(e) => setEventStartDate(e.target.value)} className="border px-3 py-2 rounded" />
            </div>
            <div>
              <label>End Date</label>
              <input type="date" value={eventEndDate} onChange={(e) => setEventEndDate(e.target.value)} className="border px-3 py-2 rounded" />
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button onClick={closeModal} className="px-4 py-2 border rounded">
              Close
            </button>
            <button onClick={handleAddOrUpdateEvent} className="px-4 py-2 bg-blue-600 text-white rounded">
              {selectedEvent ? "Update Event" : "Add Event"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Calendar;