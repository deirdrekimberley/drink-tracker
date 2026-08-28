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

export default function HistoryPage() {
  const [logs, setLogs] = useState<DrinkLog[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function loadHistory() {
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
          "Could not load history:",
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

    loadHistory();
  }, []);

  const groupedLogs = useMemo(() => {
    const groups: Record<string, DrinkLog[]> = {};

    logs.forEach((log) => {
      const date = new Date(log.loggedAt);

      const key = date.toLocaleDateString([], {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });

      if (!groups[key]) {
        groups[key] = [];
      }

      groups[key].push(log);
    });

    return groups;
  }, [logs]);

  function formatTime(dateString: string) {
    return new Date(dateString).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function getDayTotal(dayLogs: DrinkLog[]) {
    return dayLogs.reduce(
      (total, log) => total + log.pureAlcoholMl,
      0
    );
  }

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
            History
          </h1>
        </header>

        {logs.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
            <p className="font-medium">
              No history yet
            </p>

            <p className="mt-1 text-sm text-gray-400">
              Drinks you log will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedLogs).map(
              ([date, dayLogs]) => (
                <section key={date}>
                  <div className="mb-3 flex items-end justify-between">
                    <div>
                      <h2 className="font-semibold">
                        {date}
                      </h2>

                      <p className="mt-1 text-sm text-gray-500">
                        {dayLogs.length}{" "}
                        {dayLogs.length === 1
                          ? "drink"
                          : "drinks"}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-semibold">
                        {getDayTotal(dayLogs).toFixed(1)} mL
                      </p>

                      <p className="text-xs text-gray-400">
                        pure alcohol
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {dayLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm"
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-2xl">
                            {log.emoji}
                          </div>

                          <div>
                            <p className="font-semibold">
                              {log.name}
                            </p>

                            <p className="mt-1 text-sm text-gray-500">
                              {log.volumeMl} mL · {log.abv}% ABV
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {log.pureAlcoholMl.toFixed(1)} mL
                          </p>

                          <p className="mt-1 text-xs text-gray-400">
                            {formatTime(log.loggedAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  );
}