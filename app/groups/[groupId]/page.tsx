"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";

type Group = {
  id: string;
  name: string;
  invite_code: string;
};

type Member = {
  user_id: string;
  display_name: string;
};

type DrinkLog = {
  id: number;
  user_id: string;
  name: string;
  pure_alcohol_ml: number;
  logged_at: string;
};

function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function calculateStreak(logs: DrinkLog[]) {
  if (logs.length === 0) {
    return 0;
  }

  const loggedDays = new Set(
    logs.map((log) =>
      getDateKey(new Date(log.logged_at))
    )
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let currentDay = new Date(today);

  if (!loggedDays.has(getDateKey(today))) {
    if (loggedDays.has(getDateKey(yesterday))) {
      currentDay = yesterday;
    } else {
      return 0;
    }
  }

  let streak = 0;

  while (loggedDays.has(getDateKey(currentDay))) {
    streak++;

    currentDay = new Date(currentDay);
    currentDay.setDate(currentDay.getDate() - 1);
  }

  return streak;
}

export default function GroupPage() {
  const params = useParams();

  const groupId =
    params.groupId as string;

  const [group, setGroup] =
    useState<Group | null>(null);

  const [members, setMembers] =
    useState<Member[]>([]);

  const [logs, setLogs] =
    useState<DrinkLog[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");

    const [sortBy, setSortBy] =
  useState<"drinks" | "streak" | "alcohol">("drinks");

  useEffect(() => {
    loadGroup();
  }, [groupId]);

  async function loadGroup() {
    setLoading(true);
    setMessage("");

    console.log("params:", params);
console.log("groupId:", groupId);

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
      .select("id, name, invite_code")
      .eq("id", groupId)
      .single();

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
      .eq("group_id", groupId);

    if (memberError) {
      console.error(memberError);

      setMessage(
        "Could not load group members."
      );

      setLoading(false);
      return;
    }

    const memberRows =
      memberData ?? [];

    const memberIds =
      memberRows.map(
        (member) => member.user_id
      );


    let logRows: DrinkLog[] = [];

    if (memberIds.length > 0) {
      const {
        data: logData,
        error: logError,
      } = await supabase
        .from("drink_logs")
        .select(
          "id, user_id, name, pure_alcohol_ml, logged_at"
        )
        .in("user_id", memberIds)
        .order("logged_at", {
          ascending: false,
        });

      if (logError) {
        console.error(logError);

        setMessage(
          "Could not load today's drinks."
        );
      } else {
        logRows =
          (logData ?? []) as DrinkLog[];
      }
    }

    setGroup(groupData);
    setMembers(memberRows);
    setLogs(logRows);
    setLoading(false);
  }

  async function copyInviteCode() {
    if (!group) {
      return;
    }

    await navigator.clipboard.writeText(
      group.invite_code
    );

    setMessage("Invite code copied.");
  }

  const leaderboard = members
  .map((member) => {
    const memberLogs = logs.filter(
      (log) => log.user_id === member.user_id
    );

    const totalAlcohol = memberLogs.reduce(
      (sum, log) =>
        sum + Number(log.pure_alcohol_ml),
      0
    );

    return {
      ...member,
      drinks: memberLogs.length,
      streak: calculateStreak(memberLogs),
      alcohol: totalAlcohol,
    };
  })
  .sort((a, b) => {
    if (sortBy === "drinks") {
      return b.drinks - a.drinks;
    }

    if (sortBy === "streak") {
      return b.streak - a.streak;
    }

    return b.alcohol - a.alcohol;
  });

  return (
    <main className="min-h-screen bg-gray-100 px-5 py-8 pb-24 text-gray-900">
      <div className="mx-auto max-w-md">
        {loading && (
          <p className="text-sm text-gray-500">
            Loading group...
          </p>
        )}

        {!loading && group && (
          <>
            <header className="mb-6">
              <Link
                href="/groups"
                className="text-sm font-medium text-gray-500"
              >
                ← Groups
              </Link>

              <h1 className="mt-2 text-3xl font-bold">
                {group.name}
              </h1>
            </header>

            <section className="mb-6 rounded-3xl bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">
                Invite code
              </p>

              <div className="mt-2 flex items-center justify-between">
                <p className="text-2xl font-bold tracking-widest">
                  {group.invite_code}
                </p>

                <button
                  onClick={copyInviteCode}
                  className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold transition active:scale-[0.98] active:bg-gray-50"
                >
                  Copy
                </button>
              </div>
              </section>

<section className="mb-8">
  <div className="mb-3 flex items-center justify-between">
    <h2 className="text-xl font-semibold">
      Leaderboard
    </h2>
  </div>

  <div className="mb-4 grid grid-cols-3 gap-2">
    <button
      onClick={() => setSortBy("drinks")}
      className={`rounded-xl px-3 py-2 text-sm font-semibold ${
        sortBy === "drinks"
          ? "bg-gray-900 text-white"
          : "bg-white text-gray-600"
      }`}
    >
      Drinks
    </button>

    <button
      onClick={() => setSortBy("streak")}
      className={`rounded-xl px-3 py-2 text-sm font-semibold ${
        sortBy === "streak"
          ? "bg-gray-900 text-white"
          : "bg-white text-gray-600"
      }`}
    >
      Streak
    </button>

    <button
      onClick={() => setSortBy("alcohol")}
      className={`rounded-xl px-3 py-2 text-sm font-semibold ${
        sortBy === "alcohol"
          ? "bg-gray-900 text-white"
          : "bg-white text-gray-600"
      }`}
    >
      Alcohol
    </button>
  </div>

  <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
    {leaderboard.map((member, index) => (
      <Link
        key={member.user_id}
        href={`/groups/${groupId}/member/${member.user_id}`}
        className={`flex items-center gap-3 p-4 ${
          index < leaderboard.length - 1
            ? "border-b border-gray-100"
            : ""
        }`}
      >
        <div className="w-8 text-center text-xl">
  {index === 0
    ? "🥇"
    : index === 1
    ? "🥈"
    : index === 2
    ? "🥉"
    : index + 1}
</div>

        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {member.display_name}
          </p>

          <div className="mt-1 flex gap-3 text-xs text-gray-500">
            <span>
              {member.drinks} drinks
            </span>

            <span>
              {member.streak} day streak
            </span>

            <span>
              {member.alcohol.toFixed(1)} mL
            </span>
          </div>
        </div>

        <span className="text-gray-300">
          ›
        </span>
      </Link>
    ))}
  </div>
</section>

<section>
  <h2 className="mb-3 text-xl font-semibold">
    Tonight
  </h2>

              <div className="space-y-3">
                {members.map((member) => {
                  const memberLogs = logs.filter((log) => {
                    const logDate = new Date(log.logged_at);
                    const today = new Date();
                  
                    return (
                      log.user_id === member.user_id &&
                      logDate.getFullYear() === today.getFullYear() &&
                      logDate.getMonth() === today.getMonth() &&
                      logDate.getDate() === today.getDate()
                    );
                  });

                  const totalAlcohol =
                    memberLogs.reduce(
                      (sum, log) =>
                        sum +
                        Number(
                          log.pure_alcohol_ml
                        ),
                      0
                    );

                  return (
                    <div
                      key={member.user_id}
                      className="rounded-3xl bg-white p-5 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <Link
                            href={`/groups/${groupId}/member/${member.user_id}`}
                            className="font-semibold underline-offset-2 hover:underline"
                          >
                            {
                              member.display_name
                            }
                          </Link>

                          <p className="mt-1 text-sm text-gray-500">
                            {
                              memberLogs.length
                            }{" "}
                            drink
                            {memberLogs.length ===
                            1
                              ? ""
                              : "s"}{" "}
                            ·{" "}
                            {totalAlcohol.toFixed(
                              1
                            )}{" "}
                            mL alcohol
                          </p>
                        </div>
                      </div>

                      {memberLogs.length >
                        0 && (
                        <div className="mt-3 space-y-1 border-t border-gray-100 pt-3">
                          {memberLogs.map(
                            (log) => (
                              <div
                                key={
                                  log.id
                                }
                                className="flex justify-between text-sm"
                              >
                                <span>
                                  {
                                    log.name
                                  }
                                </span>

                                <span className="text-gray-500">
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
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {message && (
          <p className="mt-4 rounded-xl bg-white p-3 text-sm text-gray-700 shadow-sm">
            {message}
          </p>
        )}
      </div>

      <BottomNav />
    </main>
  );
}