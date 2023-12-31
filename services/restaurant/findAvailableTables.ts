import { times } from "@/data";
import { PrismaClient, Table } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export const findAvailableTables = async ({
  time,
  day,
  restaurant,
}: {
  time: string;
  day: string;
  restaurant: {
    tables: Table[];
    open_time: string;
    close_time: string;
  };
}) => {
  const searchTimes = times.find((t) => t.time === time)?.searchTimes;

  if (!searchTimes) {
    return NextResponse.json(
      { errorMessage: "invalid time provided" },
      { status: 400 },
    );
  }

  const bookings = await prisma.booking.findMany({
    where: {
      booking_time: {
        gte: new Date(`${day}T${searchTimes[0]}`),
        lte: new Date(`${day}T${searchTimes[searchTimes.length - 1]}`),
      },
    },
    select: {
      booking_time: true,
      number_of_people: true,
      tables: true,
    },
  });

  const bookingTableObj: { [key: string]: { [key: number]: true } } = {};

  bookings.forEach((booking) => {
    bookingTableObj[booking.booking_time.toISOString()] = booking.tables.reduce(
      (obj, table) => {
        return {
          ...obj,
          [table.table_id]: true,
        };
      },
      {},
    );
  });

  const tables = restaurant.tables;

  const searchTimesWithTables = searchTimes.map((searchTime) => {
    return {
      date: new Date(`${day}T${searchTime}`),
      time: searchTime,
      tables,
    };
  });

  searchTimesWithTables.forEach((searchTime) => {
    searchTime.tables = searchTime.tables.filter((table) => {
      if (
        bookingTableObj[searchTime.date.toISOString()] &&
        bookingTableObj[searchTime.date.toISOString()][table.id]
      ) {
        return false;
      }
      return true;
    });
  });

  return searchTimesWithTables;
};
