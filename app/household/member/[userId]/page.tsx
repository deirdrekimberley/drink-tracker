"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";

type Member = {
  user_id: string;
  display_name: string;
};

type DrinkLog = {
  id: number;
  user_id: string;
  name: string;
  emoji: string;
  volume_ml: number;
  abv: number;
  pure_alcohol_ml: number;
  logged_at: string;
};

export default function MemberPage() {
  const params = useParams();
  const userId = params.userId as string;

  const [member, setMember] =
    useState<Member | null>(null);

  const [logs, setLogs] =
    useState<DrinkLog[]>([]);

  const [loaded, setLoaded] =
    useState(false);

  useEffect(() => {
    async function loadMember() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/auth";
        return;
      }

      const {
        data: memberData,
        error: memberError,
      } = await supabase
        .from("household_members")
        .select("user_id, display_name")
        .eq("user_id", userId)
        .limit(1)
        .single();

      if (memberError) {
        console.error(
          "Could not load member:",
          memberError.message
        );

        setLoaded(true);
        return;
      }

      const {
        data: logData,
        error: logError,
      } = await supabase
        .from("drink_logs")
        .select("*")
        .eq("user_id", userId)
        .order("logged_at", {
          ascending: false,
        });

      if (logError) {
        console.error(
          "Could not load member logs:",
          logError.message
        );
      }

      setMember(memberData);
      setLogs(logData ?? []);
      setLoaded(true);
    }

    loadMember();
  }, [userId]);

  const thisMonthLogs = useMemo(() => {
    const now = new Date();

    return logs.filter((log) => {
      const date = new Date(log.logged_at);

      return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth()
      );
    });
  }, [logs]);

  const totalAlcoholMl = useMemo(() => {
    return thisMonthLogs.reduce(
      (total, log) =>
        total + Number(log.pure_alcohol_ml),
      0
    );
  }, [thisMonthLogs]);

  const drinkingDays = useMemo(() => {
    const days = new Set(
      thisMonthLogs.map((log) => {
        const date = new Date(log.logged_at);

        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      })
    );

    return days.size;
  }, [thisMonthLogs]);

  const standardDrinks =
    totalAlcoholMl / 17.05;

  const groupedLogs = useMemo(() => {
    const groups: Record<
      string,
      DrinkLog[]
    > = {};

    logs.forEach((log) => {
      const date = new Date(log.logged_at);

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
    return new Date(
      dateString
    ).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  if (!loaded) {
    return (
      <main className="min-h-screen bg-gray-100 px-5 py-8 text-gray-900">
        <div className="mx-auto max-w-md">
          <p className="text-gray-500">
            Loading...
          </p>
        </div>
      </main>
    );
  }

  if (!member) {
    return (
      <main className="min-h-screen bg-gray-100 px-5 py-8 text-gray-900">
        <div className="mx-auto max-w-md">
          <a
            href="/household"
            className="text-sm text-gray-500"
          >
            ← Household
          </a>

          <p className="mt-8">
            Member not found.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 pb-24 text-gray-900">
      <div className="mx-auto max-w-md px-5 py-8">
        <a
          href="/household"
          className="text-sm font-medium text-gray-500"
        >
          ← Household
        </a>

        <header className="mb-8 mt-5">
          <p className="text-sm font-medium text-gray-500">
            Member
          </p>

          <h1 className="mt-1 text-3xl font-bold">
            {member.display_name}
          </h1>
        </header>

        <section className="mb-8">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
            This Month
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-3xl font-bold">
                {thisMonthLogs.length}
              </p>

              <p className="mt-1 text-sm text-gray-500">
                drinks
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
                {standardDrinks.toFixed(1)}
              </p>

              <p className="mt-1 text-sm text-gray-500">
                standard drinks
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
            History
          </h2>

          {logs.length === 0 ? (
            <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
              <p className="text-gray-500">
                No drinks logged yet.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedLogs).map(
                ([date, dayLogs]) => (
                  <div key={date}>
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-semibold">
                        {date}
                      </h3>

                      <span className="text-sm text-gray-500">
                        {dayLogs.length}{" "}
                        {dayLogs.length === 1
                          ? "drink"
                          : "drinks"}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {dayLogs.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">
                              {log.emoji}
                            </span>

                            <div>
                              <p className="font-semibold">
                                {log.name}
                              </p>

                              <p className="text-sm text-gray-500">
                                {Number(
                                  log.volume_ml
                                )}{" "}
                                mL ·{" "}
                                {Number(log.abv)}%
                                ABV
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {Number(
                                log.pure_alcohol_ml
                              ).toFixed(1)}{" "}
                              mL
                            </p>

                            <p className="text-xs text-gray-400">
                              {formatTime(
                                log.logged_at
                              )}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </section>
      </div>
      <BottomNav />
    </main>
  );
}