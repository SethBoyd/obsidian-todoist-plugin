import type { DueDate as ApiDueDate } from "@/api/domain/dueDate";
import { now, timezone, today } from "@/infra/time";
import { CalendarDate, ZonedDateTime, parseAbsolute, parseDate } from "@internationalized/date";

export class DueDate {
  private inner: ZonedDateTime | CalendarDate;

  constructor(dueDate: ApiDueDate) {
    if (dueDate.datetime !== undefined) {
      // Todoist's datetime comes as a UTC timezone, but without the trailing 'Z'.
      // So we just patch it in and carry on our merry way.
      this.inner = parseAbsolute(`${dueDate.datetime}Z`, timezone());
    } else {
      this.inner = parseDate(dueDate.date);
    }
  }

  hasTime(): boolean {
    return this.inner instanceof ZonedDateTime;
  }

  isToday(): boolean {
    const date = this.calendarDate();
    return date.compare(today()) === 0;
  }

  isOverdue(): boolean {
    if (this.inner instanceof CalendarDate) {
      return this.inner.compare(today()) < 0;
    }

    return this.inner.compare(now()) < 0;
  }

  isTomorrow(): boolean {
    const date = this.calendarDate();
    return date.compare(today().add({ days: 1 })) === 0;
  }

  isYesterday(): boolean {
    const date = this.calendarDate();
    return date.compare(today().add({ days: -1 })) === 0;
  }

  isInLastWeek(): boolean {
    const date = this.calendarDate();
    return date.compare(today().add({ days: -7 })) >= 0 && date.compare(today()) < 0;
  }

  isInNextWeek(): boolean {
    const date = this.calendarDate();
    return date.compare(today().add({ days: 7 })) <= 0 && date.compare(today()) > 0;
  }

  isCurrentYear(): boolean {
    const date = this.calendarDate();
    return date.year === today().year;
  }

  format(formatter: Intl.DateTimeFormat): string {
    return formatter.format(this.naiveDate());
  }

  compareDate(other: DueDate): -1 | 0 | 1 {
    const thisDate = this.calendarDate();
    const otherDate = other.calendarDate();
    const cmp = thisDate.compare(otherDate);

    if (cmp === 0) {
      return 0;
    }

    if (cmp < 0) {
      return -1;
    }

    return 1;
  }

  compareDateTime(other: DueDate): -1 | 0 | 1 {
    if (!(this.inner instanceof ZonedDateTime) || !(other.inner instanceof ZonedDateTime)) {
      throw new Error("Called compareDateTime on due dates without time");
    }

    const cmp = this.inner.compare(other.inner);
    if (cmp === 0) {
      return 0;
    }

    if (cmp < 0) {
      return -1;
    }

    return 1;
  }

  private naiveDate(): Date {
    if (this.inner instanceof CalendarDate) {
      return this.inner.toDate(timezone());
    }

    return this.inner.toDate();
  }

  private calendarDate(): CalendarDate {
    if (this.inner instanceof CalendarDate) {
      return this.inner;
    }

    return new CalendarDate(this.inner.year, this.inner.month, this.inner.day);
  }
}
