"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";

type Household = {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
};

type HouseholdMember = {
  household_id: string;
  user_id: string;
  display_name: string;
  joined_at?: string;
};

type DatabaseDrinkLog = {
  id: number;
  user_id: string;
  name: string;
  emoji: string;
  volume_ml: number;
  abv: number;
  pure_alcohol_ml: number;
  logged_at: string;
};

type DrinkLog = {
  id: number;
  userId: string;
  name: string;
  emoji: string;
  volumeMl: number;
  abv: number;
  pureAlcoholMl: number;
  loggedAt: string;
};

export default function HouseholdPage() {
  const [loaded, setLoaded] = useState(false);

  const [household, setHousehold] =
    useState<Household | null>(null);

  const [members, setMembers] =
    useState<HouseholdMember[]>([]);

  const [logs, setLogs] =
    useState<DrinkLog[]>([]);

  const [householdName, setHouseholdName] =
    useState("");

  const [displayName, setDisplayName] =
    useState("");

  const [inviteCode, setInviteCode] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [loadingAction, setLoadingAction] =
    useState(false);

  useEffect(() => {
    loadHousehold();
  }, []);

  async function loadHousehold() {
    setLoaded(false);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/auth";
      return;
    }

    const {
      data: memberships,
      error: membershipError,
    } = await supabase
      .from("household_members")
      .select("household_id")
      .eq("user_id", user.id)
      .limit(1);

    if (membershipError) {
      console.error(
        "Could not load membership:",
        membershipError.message
      );

      setLoaded(true);
      return;
    }

    if (!memberships || memberships.length === 0) {
      setHousehold(null);
      setMembers([]);
      setLogs([]);
      setLoaded(true);
      return;
    }

    const householdId =
      memberships[0].household_id;

    const {
      data: householdData,
      error: householdError,
    } = await supabase
      .from("households")
      .select("*")
      .eq("id", householdId)
      .single();

    if (householdError) {
      console.error(
        "Could not load household:",
        householdError.message
      );

      setLoaded(true);
      return;
    }

    const {
      data: memberData,
      error: membersError,
    } = await supabase
      .from("household_members")
      .select("*")
      .eq("household_id", householdId)
      .order("joined_at", {
        ascending: true,
      });

    if (membersError) {
      console.error(
        "Could not load household members:",
        membersError.message
      );
    }

    const {
      data: logData,
      error: logError,
    } = await supabase
      .from("drink_logs")
      .select("*")
      .order("logged_at", {
        ascending: false,
      });

    if (logError) {
      console.error(
        "Could not load household drink logs:",
        logError.message
      );
    }

    const convertedLogs =
      ((logData ?? []) as DatabaseDrinkLog[]).map(
        (log) => ({
          id: log.id,
          userId: log.user_id,
          name: log.name,
          emoji: log.emoji,
          volumeMl: Number(log.volume_ml),
          abv: Number(log.abv),
          pureAlcoholMl: Number(
            log.pure_alcohol_ml
          ),
          loggedAt: log.logged_at,
        })
      );

    setHousehold(householdData);
    setMembers(memberData ?? []);
    setLogs(convertedLogs);
    setLoaded(true);
  }

  function generateInviteCode() {
    const characters =
      "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code = "";

    for (let i = 0; i < 6; i++) {
      code +=
        characters[
          Math.floor(
            Math.random() * characters.length
          )
        ];
    }

    return code;
  }

  async function createHousehold() {
    setMessage("");

    if (!householdName.trim()) {
      setMessage("Enter a household name.");
      return;
    }

    if (!displayName.trim()) {
      setMessage("Enter your display name.");
      return;
    }

    setLoadingAction(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/auth";
      return;
    }

    const newInviteCode =
      generateInviteCode();

    const {
      data: newHousehold,
      error: householdError,
    } = await supabase
      .from("households")
      .insert({
        name: householdName.trim(),
        invite_code: newInviteCode,
        created_by: user.id,
      })
      .select()
      .single();

    if (householdError) {
      console.error(
        "Could not create household:",
        householdError.message
      );

      setMessage(
        "Could not create household."
      );

      setLoadingAction(false);
      return;
    }

    const { error: memberError } =
      await supabase
        .from("household_members")
        .insert({
          household_id: newHousehold.id,
          user_id: user.id,
          display_name:
            displayName.trim(),
        });

    if (memberError) {
      console.error(
        "Could not add household member:",
        memberError.message
      );

      setMessage(
        "Household created, but could not add you as a member."
      );

      setLoadingAction(false);
      return;
    }

    setHouseholdName("");
    setDisplayName("");
    setLoadingAction(false);

    await loadHousehold();
  }

  async function joinHousehold() {
    setMessage("");

    if (!inviteCode.trim()) {
      setMessage("Enter an invite code.");
      return;
    }

    if (!displayName.trim()) {
      setMessage("Enter your display name.");
      return;
    }

    setLoadingAction(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/auth";
      return;
    }

    const { error } = await supabase.rpc(
      "join_household_by_code",
      {
        p_invite_code: inviteCode
          .trim()
          .toUpperCase(),

        p_display_name:
          displayName.trim(),
      }
    );

    if (error) {
      console.error(
        "Could not join household:",
        error.message
      );

      if (
        error.message.includes(
          "Invalid invite code"
        )
      ) {
        setMessage(
          "Invite code not found."
        );
      } else {
        setMessage(
          "Could not join household."
        );
      }

      setLoadingAction(false);
      return;
    }

    setInviteCode("");
    setDisplayName("");
    setLoadingAction(false);

    await loadHousehold();
  }

  function isToday(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();

    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  }

  function formatTime(dateString: string) {
    return new Date(dateString).toLocaleTimeString(
      [],
      {
        hour: "numeric",
        minute: "2-digit",
      }
    );
  }

  const todayLogs = useMemo(() => {
    return logs.filter((log) =>
      isToday(log.loggedAt)
    );
  }, [logs]);

  function getMemberLogs(userId: string) {
    return todayLogs.filter(
      (log) => log.userId === userId
    );
  }

  function getMemberAlcoholTotal(
    userId: string
  ) {
    return getMemberLogs(userId).reduce(
      (total, log) =>
        total + log.pureAlcoholMl,
      0
    );
  }

  if (!loaded) {
    return (
      <main className="min-h-screen bg-gray-100 text-gray-900">
        <div className="mx-auto max-w-md px-5 py-8">
          <p className="text-gray-500">
            Loading...
          </p>
        </div>
      </main>
    );
  }

  if (household) {
    return (
      <main className="min-h-screen bg-gray-100 pb-24 text-gray-900">
        <div className="mx-auto max-w-md px-5 py-8">
          <header className="mb-8">
            <p className="text-sm font-medium text-gray-500">
              Household
            </p>

            <h1 className="mt-1 text-3xl font-bold">
              {household.name}
            </h1>
          </header>

          <section className="mb-8">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Tonight
            </h2>

            <div className="space-y-4">
              {members.map((member) => {
                const memberLogs =
                  getMemberLogs(member.user_id);

                const alcoholTotal =
                  getMemberAlcoholTotal(
                    member.user_id
                  );

                return (
                  <div
                    key={member.user_id}
                    className="rounded-3xl bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {member.display_name}
                        </h3>

                        <p className="mt-1 text-sm text-gray-500">
                          {memberLogs.length}{" "}
                          {memberLogs.length === 1
                            ? "drink"
                            : "drinks"}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="font-semibold">
                          {alcoholTotal.toFixed(
                            1
                          )}{" "}
                          mL
                        </p>

                        <p className="text-xs text-gray-400">
                          pure alcohol
                        </p>
                      </div>
                    </div>

                    {memberLogs.length === 0 ? (
                      <p className="mt-4 text-sm text-gray-400">
                        No drinks logged today.
                      </p>
                    ) : (
                      <div className="mt-4 space-y-3">
                        {memberLogs.map(
                          (log) => (
                            <div
                              key={log.id}
                              className="flex items-center justify-between border-t border-gray-100 pt-3"
                            >
                              <div className="flex items-center gap-3">
                                <div className="text-xl">
                                  {log.emoji}
                                </div>

                                <div>
                                  <p className="font-medium">
                                    {log.name}
                                  </p>

                                  <p className="text-xs text-gray-400">
                                    {
                                      log.volumeMl
                                    }{" "}
                                    mL ·{" "}
                                    {log.abv}% ABV
                                  </p>
                                </div>
                              </div>

                              <div className="text-right">
                                <p className="text-sm font-medium">
                                  {log.pureAlcoholMl.toFixed(
                                    1
                                  )}{" "}
                                  mL
                                </p>

                                <p className="text-xs text-gray-400">
                                  {formatTime(
                                    log.loggedAt
                                  )}
                                </p>
                              </div>
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

          <section className="mb-8">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Members
            </h2>

            <div className="space-y-3">
              {members.map((member) => (
                <a
                  key={member.user_id}
                  href={`/household/member/${member.user_id}`}
                  className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm"
                >
                  <p className="font-semibold">
                    {member.display_name}
                  </p>

                  <span className="text-gray-400">
                    ›
                  </span>
                </a>
              ))}
            </div>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Invite code
            </p>

            <div className="mt-3 flex items-center justify-between">
              <p className="text-3xl font-bold tracking-widest">
                {household.invite_code}
              </p>

              <button
                onClick={() =>
                  navigator.clipboard.writeText(
                    household.invite_code
                  )
                }
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
              >
                Copy
              </button>
            </div>

            <p className="mt-3 text-sm text-gray-400">
              Share this code with your roommates.
            </p>
          </section>
        </div>

        <nav className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white">
          <div className="mx-auto flex max-w-md justify-around px-6 py-4 text-sm">
            <a
              href="/"
              className="text-gray-500"
            >
              Home
            </a>

            <a
              href="/history"
              className="text-gray-500"
            >
              History
            </a>

            <a
              href="/stats"
              className="text-gray-500"
            >
              Stats
            </a>

            <a
              href="/household"
              className="font-semibold text-gray-900"
            >
              Household
            </a>
          </div>
        </nav>
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
            Your Household
          </h1>

          <p className="mt-3 text-gray-500">
            Create a household or join your roommates using an invite code.
          </p>
        </header>

        <section className="mb-8 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">
            Create a household
          </h2>

          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-600">
                Household name
              </label>

              <input
                value={householdName}
                onChange={(e) =>
                  setHouseholdName(
                    e.target.value
                  )
                }
                placeholder="e.g. 123 College House"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-gray-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-600">
                Your display name
              </label>

              <input
                value={displayName}
                onChange={(e) =>
                  setDisplayName(
                    e.target.value
                  )
                }
                placeholder="e.g. Deirdre"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-gray-500"
              />
            </div>

            <button
              onClick={createHousehold}
              disabled={loadingAction}
              className="w-full rounded-xl bg-gray-900 px-4 py-3 font-semibold text-white disabled:opacity-50"
            >
              Create Household
            </button>
          </div>
        </section>

        <div className="my-8 flex items-center gap-4">
          <div className="h-px flex-1 bg-gray-300" />

          <span className="text-sm text-gray-400">
            or
          </span>

          <div className="h-px flex-1 bg-gray-300" />
        </div>

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">
            Join a household
          </h2>

          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-600">
                Invite code
              </label>

              <input
                value={inviteCode}
                onChange={(e) =>
                  setInviteCode(
                    e.target.value.toUpperCase()
                  )
                }
                placeholder="K7P4XM"
                maxLength={6}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 uppercase tracking-widest outline-none focus:border-gray-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-600">
                Your display name
              </label>

              <input
                value={displayName}
                onChange={(e) =>
                  setDisplayName(
                    e.target.value
                  )
                }
                placeholder="e.g. Deirdre"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-gray-500"
              />
            </div>

            <button
              onClick={joinHousehold}
              disabled={loadingAction}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 font-semibold text-gray-700 disabled:opacity-50"
            >
              Join Household
            </button>
          </div>
        </section>

        {message && (
          <p className="mt-6 rounded-xl bg-white p-4 text-sm text-gray-700 shadow-sm">
            {message}
          </p>
        )}
      </div>

      <BottomNav />
    </main>
  );
}