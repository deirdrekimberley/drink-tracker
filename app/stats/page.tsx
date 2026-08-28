"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";

type DrinkLog = {
  id: number;
  name: string;
  emoji: string;
  volumeMl: number;
  abv: number;
  pureAlcoholMl: number;
  loggedAt: string;
};

type DatabaseDrinkLog = {
  id: number;
  name: string;
  emoji: string;
  volume_ml: number;
  abv: number;
  pure_alcohol_ml: number;
  logged_at: string;
};

function convertDatabaseLog(log: DatabaseDrinkLog): DrinkLog {
  return {
    id: log.id,
    name: log.name,
    emoji: log.emoji,
    volumeMl: Number(log.volume_ml),
    abv: Number(log.abv),
    pureAlcoholMl: Number(log.pure_alcohol_ml),
    loggedAt: log.logged_at,
  };
}

function getDateKey(dateString: string) {
  const date = new Date(dateString);

  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function isThisMonth(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
}

export default function StatsPage() {
  const [logs, setLogs] = useState<DrinkLog[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function loadStats() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/auth";
        return;
      }

      const { data, error } = await supabase
  .from("drink_logs")
  .select("*")
  .eq("user_id", user.id)
  .order("logged_at", { ascending: false });

      if (error) {
        console.error(
          "Could not load stats:",
          error.message,
          error.code,
          error.details,
          error.hint
        );

        setLoaded(true);
        return;
      }

      const databaseLogs =
        (data ?? []) as DatabaseDrinkLog[];

      setLogs(databaseLogs.map(convertDatabaseLog));
      setLoaded(true);
    }

    loadStats();
  }, []);

  const monthLogs = useMemo(() => {
    return logs.filter((log) =>
      isThisMonth(log.loggedAt)
    );
  }, [logs]);

  const totalAlcoholMl = useMemo(() => {
    return monthLogs.reduce(
      (total, log) => total + log.pureAlcoholMl,
      0
    );
  }, [monthLogs]);

  const drinkingDays = useMemo(() => {
    const uniqueDays = new Set(
      monthLogs.map((log) =>
        getDateKey(log.loggedAt)
      )
    );

    return uniqueDays.size;
  }, [monthLogs]);

  const averagePerDrinkingDay =
    drinkingDays > 0
      ? monthLogs.length / drinkingDays
      : 0;

  const canadianStandardDrinks =
    totalAlcoholMl / 17.05;

  const mostCommonDrink = useMemo(() => {
    if (monthLogs.length === 0) {
      return null;
    }

    const counts: Record<string, number> = {};

    monthLogs.forEach((log) => {
      counts[log.name] =
        (counts[log.name] || 0) + 1;
    });

    return Object.entries(counts).sort(
      (a, b) => b[1] - a[1]
    )[0];
  }, [monthLogs]);

  if (!loaded) {
    return (
      <main className="min-h-screen bg-gray-100 text-gray-900">
        <div className="mx-auto max-w-md px-5 py-8">
          <p className="text-gray-500">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 pb-24 text-gray-900">
      <div className="mx-auto max-w-md px-5 py-8">
        <header className="mb-8">
          <p className="text-sm font-medium text-gray-500">
            Drink Tracker
          </p>

          <h1 className="mt-1 text-3xl font-bold">
            Stats
          </h1>
        </header>

        <section className="mb-8">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
            This Month
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-3xl font-bold">
                {monthLogs.length}
              </p>

              <p className="mt-1 text-sm text-gray-500">
                drinks logged
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-3xl font-bold">
                {totalAlcoholMl.toFixed(1)}
              </p>

              <p className="mt-1 text-sm text-gray-500">
                mL pure alcohol
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-3xl font-bold">
                {drinkingDays}
              </p>

              <p className="mt-1 text-sm text-gray-500">
                drinking days
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-3xl font-bold">
                {averagePerDrinkingDay.toFixed(1)}
              </p>

              <p className="mt-1 text-sm text-gray-500">
                avg / drinking day
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Canadian standard drinks
            </p>

            <p className="mt-2 text-2xl font-bold">
              {canadianStandardDrinks.toFixed(1)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Most logged drink
            </p>

            <p className="mt-2 text-2xl font-bold">
              {mostCommonDrink
                ? mostCommonDrink[0]
                : "—"}
            </p>

            {mostCommonDrink && (
              <p className="mt-1 text-sm text-gray-400">
                {mostCommonDrink[1]}{" "}
                {mostCommonDrink[1] === 1
                  ? "time"
                  : "times"}
              </p>
            )}
          </div>
        </section>
      </div>

    
        <BottomNav />
    </main>
  );
}