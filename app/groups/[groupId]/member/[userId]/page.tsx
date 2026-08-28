"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";

type Group = {
  id: string;
  name: string;
};

type Member = {
  user_id: string;
  display_name: string;
};

type DrinkLog = {
  id: number;
  name: string;
  emoji: string;
  volume_ml: number;
  abv: number;
  pure_alcohol_ml: number;
  logged_at: string;
};

export default function MemberPage() {
  const params = useParams();

  const groupId =
    params.groupId as string;

  const userId =
    params.userId as string;

  const [group, setGroup] =
    useState<Group | null>(null);

  const [member, setMember] =
    useState<Member | null>(null);

  const [logs, setLogs] =
    useState<DrinkLog[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    loadMember();
  }, [groupId, userId]);

  async function loadMember() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/auth";
      return;
    }

    const {
      data: groupData,
      error: groupError,
    } = await supabase
      .from("groups")
      .select("id, name")
      .eq("id", groupId)
      .maybeSingle();

    if (groupError || !groupData) {
      console.error(groupError);

      setMessage(
        "Could not load this group."
      );

      setLoading(false);
      return;
    }

    const {
      data: memberData,
      error: memberError,
    } = await supabase
      .from("group_members")
      .select("user_id, display_name")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .maybeSingle();

    if (memberError || !memberData) {
      console.error(memberError);

      setMessage(
        "Could not load this member."
      );

      setLoading(false);
      return;
    }

    const {
      data: logData,
      error: logError,
    } = await supabase
      .from("drink_logs")
      .select(
        "id, name, emoji, volume_ml, abv, pure_alcohol_ml, logged_at"
      )
      .eq("user_id", userId)
      .order("logged_at", {
        ascending: false,
      });

    if (logError) {
      console.error(logError);

      setMessage(
        "Could not load drink history."
      );

      setLoading(false);
      return;
    }

    setGroup(groupData);
    setMember(memberData);

    setLogs(
      (logData ?? []) as DrinkLog[]
    );

    setLoading(false);
  }

  const totalAlcohol =
    logs.reduce(
      (sum, log) =>
        sum +
        Number(log.pure_alcohol_ml),
      0
    );

  const standardDrinks =
    totalAlcohol / 17.05;

  const groupedLogs =
    logs.reduce(
      (
        groups: Record<
          string,
          DrinkLog[]
        >,
        log
      ) => {
        const date =
          new Date(
            log.logged_at
          ).toLocaleDateString();

        if (!groups[date]) {
          groups[date] = [];
        }

        groups[date].push(log);

        return groups;
      },
      {}
    );

  return (
    <main className="min-h-screen bg-gray-100 px-5 py-8 pb-24 text-gray-900">
      <div className="mx-auto max-w-md">
        {loading && (
          <p className="text-sm text-gray-500">
            Loading member...
          </p>
        )}

        {!loading &&
          group &&
          member && (
            <>
              <header className="mb-6">
                <Link
                  href={`/groups/${groupId}`}
                  className="text-sm font-medium text-gray-500"
                >
                  ← {group.name}
                </Link>

                <h1 className="mt-2 text-3xl font-bold">
                  {member.display_name}
                </h1>
              </header>

              <section className="mb-6 grid grid-cols-2 gap-3">
                <div className="rounded-3xl bg-white p-5 shadow-sm">
                  <p className="text-sm text-gray-500">
                    Total drinks
                  </p>

                  <p className="mt-1 text-2xl font-bold">
                    {logs.length}
                  </p>
                </div>

                <div className="rounded-3xl bg-white p-5 shadow-sm">
                  <p className="text-sm text-gray-500">
                    Pure alcohol
                  </p>

                  <p className="mt-1 text-2xl font-bold">
                    {totalAlcohol.toFixed(
                      1
                    )}{" "}
                    mL
                  </p>
                </div>

                <div className="col-span-2 rounded-3xl bg-white p-5 shadow-sm">
                  <p className="text-sm text-gray-500">
                    Canadian standard drinks
                  </p>

                  <p className="mt-1 text-2xl font-bold">
                    {standardDrinks.toFixed(
                      1
                    )}
                  </p>
                </div>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-semibold">
                  History
                </h2>

                {logs.length === 0 && (
                  <div className="rounded-3xl bg-white p-5 shadow-sm">
                    <p className="text-sm text-gray-500">
                      No drinks logged yet.
                    </p>
                  </div>
                )}

                <div className="space-y-5">
                  {Object.entries(
                    groupedLogs
                  ).map(
                    ([date, dayLogs]) => {
                      const dayAlcohol =
                        dayLogs.reduce(
                          (sum, log) =>
                            sum +
                            Number(
                              log.pure_alcohol_ml
                            ),
                          0
                        );

                      return (
                        <div key={date}>
                          <div className="mb-2 flex items-center justify-between">
                            <h3 className="font-semibold">
                              {date}
                            </h3>

                            <p className="text-sm text-gray-500">
                              {
                                dayLogs.length
                              }{" "}
                              drink
                              {dayLogs.length ===
                              1
                                ? ""
                                : "s"}{" "}
                              ·{" "}
                              {dayAlcohol.toFixed(
                                1
                              )}{" "}
                              mL
                            </p>
                          </div>

                          <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
                            {dayLogs.map(
                              (
                                log,
                                index
                              ) => (
                                <div
                                  key={
                                    log.id
                                  }
                                  className={`flex items-center justify-between p-4 ${
                                    index <
                                    dayLogs.length -
                                      1
                                      ? "border-b border-gray-100"
                                      : ""
                                  }`}
                                >
                                  <div>
                                    <p className="font-medium">
                                      {
                                        log.emoji
                                      }{" "}
                                      {
                                        log.name
                                      }
                                    </p>

                                    <p className="mt-1 text-sm text-gray-500">
                                      {
                                        log.volume_ml
                                      }{" "}
                                      mL ·{" "}
                                      {
                                        log.abv
                                      }
                                      % ABV
                                    </p>
                                  </div>

                                  <p className="text-sm text-gray-500">
                                    {new Date(
                                      log.logged_at
                                    ).toLocaleTimeString(
                                      [],
                                      {
                                        hour: "numeric",
                                        minute:
                                          "2-digit",
                                      }
                                    )}
                                  </p>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </section>
            </>
          )}

        {message && (
          <p className="rounded-xl bg-white p-4 text-sm text-gray-700 shadow-sm">
            {message}
          </p>
        )}
      </div>

      <BottomNav />
    </main>
  );
}