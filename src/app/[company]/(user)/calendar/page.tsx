"use client";

import { useParams } from "next/navigation";
import Calendar from "@/components/calendar/Calendar";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

export default function CalendarPage() {
  const params = useParams();
  const company = params.company as string;

  return (
    <div className="p-4">
      <PageBreadcrumb pageTitle="Calendar" company={company} />
      <Calendar company={company || "default"} />
    </div>
  );
}
