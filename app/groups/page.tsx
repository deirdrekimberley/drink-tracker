"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";

type GroupMembership = {
    group_id: string;
    display_name: string;
    groups: {
      id: string;
      name: string;
      invite_code: string;
    }[];
  };

export default function GroupsPage() {
  const [memberships, setMemberships] =
    useState<GroupMembership[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");

    const [showCreateForm, setShowCreateForm] =
  useState(false);

const [showJoinForm, setShowJoinForm] =
  useState(false);

const [groupName, setGroupName] =
  useState("");

const [displayName, setDisplayName] =
  useState("");

const [inviteCode, setInviteCode] =
  useState("");

  useEffect(() => {
    loadGroups();
  }, []);

  async function loadGroups() {
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
      data: memberRows,
      error: memberError,
    } = await supabase
      .from("group_members")
      .select("group_id, display_name")
      .eq("user_id", user.id);
  
    if (memberError) {
      console.error(memberError);
  
      setMessage(
        "Could not load your group memberships."
      );
  
      setLoading(false);
      return;
    }
  
    const memberships =
      memberRows ?? [];
  
    if (memberships.length === 0) {
      setMemberships([]);
      setLoading(false);
      return;
    }
  
    const groupIds =
      memberships.map(
        (membership) => membership.group_id
      );
  
    const {
      data: groupRows,
      error: groupError,
    } = await supabase
      .from("groups")
      .select("id, name, invite_code")
      .in("id", groupIds);
  
    if (groupError) {
      console.error(groupError);
  
      setMessage(
        "Could not load your groups."
      );
  
      setLoading(false);
      return;
    }
  
    const combined =
      memberships.map((membership) => {
        const group =
          groupRows?.find(
            (group) =>
              group.id === membership.group_id
          ) ?? null;
  
        return {
          group_id: membership.group_id,
          display_name:
            membership.display_name,
          groups: group
            ? [group]
            : [],
        };
      });
  
    setMemberships(combined);
  
    setLoading(false);
  }

  async function createGroup() {
    setMessage("");
  
    const {
      data: { user },
    } = await supabase.auth.getUser();
  
    if (!user) {
      window.location.href = "/auth";
      return;
    }
  
    if (
      !groupName.trim() ||
      !displayName.trim()
    ) {
      setMessage(
        "Enter a group name and display name."
      );
      return;
    }
  
    const characters =
      "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  
    let code = "";
  
    for (let i = 0; i < 6; i++) {
      code +=
        characters[
          Math.floor(
            Math.random() *
              characters.length
          )
        ];
    }
  
    const {
      data: newGroup,
      error: groupError,
    } = await supabase
      .from("groups")
      .insert({
        name: groupName.trim(),
        invite_code: code,
        created_by: user.id,
      })
      .select()
      .single();
  
    if (groupError || !newGroup) {
      console.error(groupError);
  
      setMessage(
        "Could not create group."
      );
      return;
    }
  
    const { error: memberError } =
      await supabase
        .from("group_members")
        .insert({
          group_id: newGroup.id,
          user_id: user.id,
          display_name:
            displayName.trim(),
        });
  
    if (memberError) {
      console.error(memberError);
  
      setMessage(
        "Group created, but membership could not be added."
      );
      return;
    }
  
    setGroupName("");
    setDisplayName("");
    setShowCreateForm(false);
  
    await loadGroups();
  }

  async function joinGroup() {
    setMessage("");
  
    if (
      !inviteCode.trim() ||
      !displayName.trim()
    ) {
      setMessage(
        "Enter an invite code and display name."
      );
      return;
    }
  
    const { error } =
      await supabase.rpc(
        "join_group_by_code",
        {
          p_invite_code:
            inviteCode.trim(),
          p_display_name:
            displayName.trim(),
        }
      );
  
    if (error) {
      console.error(error);
  
      setMessage(
        error.message ||
          "Could not join group."
      );
      return;
    }
  
    setInviteCode("");
    setDisplayName("");
    setShowJoinForm(false);
  
    await loadGroups();
  }

  return (
    <main className="min-h-screen bg-gray-100 px-5 py-8 pb-24 text-gray-900">
      <div className="mx-auto max-w-md">
        <header className="mb-6">
          <p className="text-sm font-medium text-gray-500">
            Drink Tracker
          </p>

          <h1 className="mt-1 text-3xl font-bold">
            Your Groups
          </h1>
        </header>

        {loading && (
          <p className="text-sm text-gray-500">
            Loading groups...
          </p>
        )}

        {message && (
          <p className="mb-4 rounded-xl bg-white p-4 text-sm text-gray-700 shadow-sm">
            {message}
          </p>
        )}

        {!loading &&
          memberships.length === 0 && (
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <p className="font-semibold">
                You're not in any groups yet.
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Create a group or join one with an invite code.
              </p>
            </div>
          )}

        <div className="space-y-3">
          {memberships.map((membership) => {
            const group =
            membership.groups[0];

            if (!group) {
              return null;
            }

            return (
              <Link
                key={membership.group_id}
                href={`/groups/${group.id}`}
                className="block rounded-3xl bg-white p-5 shadow-sm transition hover:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">
                      {group.name}
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                      You're {membership.display_name}
                    </p>
                  </div>

                  <span className="text-xl text-gray-400">
                    →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
  <button
    className="rounded-2xl bg-gray-900 px-4 py-3 font-semibold text-white"
    onClick={() => {
      setShowCreateForm(
        !showCreateForm
      );
      setShowJoinForm(false);
      setMessage("");
    }}
  >
    Create Group
  </button>

  <button
    className="rounded-2xl border border-gray-300 bg-white px-4 py-3 font-semibold text-gray-700"
    onClick={() => {
      setShowJoinForm(
        !showJoinForm
      );
      setShowCreateForm(false);
      setMessage("");
    }}
  >
    Join Group
  </button>
</div>

{showCreateForm && (
  <div className="mt-4 space-y-3 rounded-3xl bg-white p-5 shadow-sm">
    <h2 className="text-lg font-semibold">
      Create Group
    </h2>

    <input
      value={groupName}
      onChange={(e) =>
        setGroupName(e.target.value)
      }
      placeholder="Group name"
      className="w-full rounded-xl border border-gray-300 px-4 py-3"
    />

    <input
      value={displayName}
      onChange={(e) =>
        setDisplayName(e.target.value)
      }
      placeholder="Your display name"
      className="w-full rounded-xl border border-gray-300 px-4 py-3"
    />

    <button
      onClick={createGroup}
      className="w-full rounded-xl bg-gray-900 px-4 py-3 font-semibold text-white"
    >
      Create
    </button>
  </div>
)}

{showJoinForm && (
  <div className="mt-4 space-y-3 rounded-3xl bg-white p-5 shadow-sm">
    <h2 className="text-lg font-semibold">
      Join Group
    </h2>

    <input
      value={inviteCode}
      onChange={(e) =>
        setInviteCode(
          e.target.value.toUpperCase()
        )
      }
      placeholder="Invite code"
      className="w-full rounded-xl border border-gray-300 px-4 py-3 uppercase"
    />

    <input
      value={displayName}
      onChange={(e) =>
        setDisplayName(e.target.value)
      }
      placeholder="Your display name"
      className="w-full rounded-xl border border-gray-300 px-4 py-3"
    />

    <button
      onClick={joinGroup}
      className="w-full rounded-xl bg-gray-900 px-4 py-3 font-semibold text-white"
    >
      Join
    </button>
  </div>
)}
      </div>

      <BottomNav />
    </main>
  );
}