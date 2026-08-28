"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";


type Drink = {
  id?: number;
  name: string;
  emoji: string;
  volumeMl: number;
  abv: number;
};

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

type DatabaseFavourite = {
  id: number;
  name: string;
  emoji: string;
  volume_ml: number;
  abv: number;
};

const defaultDrinks: Drink[] = [
  { name: "Beer", emoji: "🍺", volumeMl: 355, abv: 5 },
  { name: "Wine", emoji: "🍷", volumeMl: 142, abv: 12 },
  { name: "Shot", emoji: "🥃", volumeMl: 44, abv: 40 },
  { name: "Seltzer", emoji: "🥤", volumeMl: 355, abv: 5 },
];

function isToday(dateString: string) {
  const logDate = new Date(dateString);
  const today = new Date();

  return (
    logDate.getFullYear() === today.getFullYear() &&
    logDate.getMonth() === today.getMonth() &&
    logDate.getDate() === today.getDate()
  );
}

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

export default function Home() {
  const [logs, setLogs] = useState<DrinkLog[]>([]);
  const customFormRef = useRef<HTMLElement>(null);
  const [favourites, setFavourites] = useState<Drink[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customVolume, setCustomVolume] = useState("");
  const [customAbv, setCustomAbv] = useState("");
  const [saveFavourite, setSaveFavourite] = useState(true);

  useEffect(() => {
    async function loadPage() {
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
        console.error("Could not load drink logs:", error);
      } else {
        const databaseLogs = (data ?? []) as DatabaseDrinkLog[];
        setLogs(databaseLogs.map(convertDatabaseLog));
      }

      const { data: favouriteData, error: favouriteError } =
  await supabase
    .from("drink_favourites")
    .select("*")
    .order("created_at", { ascending: false });

if (favouriteError) {
  console.error(
    "Could not load favourites:",
    favouriteError.message
  );
} else {
  const databaseFavourites =
    (favouriteData ?? []) as DatabaseFavourite[];

  setFavourites(
    databaseFavourites.map((drink) => ({
      id: drink.id,
      name: drink.name,
      emoji: drink.emoji,
      volumeMl: Number(drink.volume_ml),
      abv: Number(drink.abv),
    }))
  );
}

      setLoaded(true);
    }

    loadPage();
  }, []);

  const todaysLogs = useMemo(() => {
    return logs.filter((log) => isToday(log.loggedAt));
  }, [logs]);

  const totalAlcoholMl = useMemo(() => {
    return todaysLogs.reduce(
      (total, log) => total + log.pureAlcoholMl,
      0
    );
  }, [todaysLogs]);

  async function addDrink(drink: Drink) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/auth";
      return;
    }

    const pureAlcoholMl =
      drink.volumeMl * (drink.abv / 100);

    const { data, error } = await supabase
      .from("drink_logs")
      .insert({
        user_id: user.id,
        name: drink.name,
        emoji: drink.emoji,
        volume_ml: drink.volumeMl,
        abv: drink.abv,
        pure_alcohol_ml: pureAlcoholMl,
      })
      .select()
      .single();

    if (error) {
      console.error("Could not add drink:", error);
      alert("Could not add drink.");
      return;
    }

    const newLog = convertDatabaseLog(
      data as DatabaseDrinkLog
    );

    setLogs((current) => [newLog, ...current]);
  }

  async function addCustomDrink() {
    const volumeMl = Number(customVolume);
    const abv = Number(customAbv);

    if (
      !customName.trim() ||
      volumeMl <= 0 ||
      abv <= 0
    ) {
      return;
    }

    const newDrink: Drink = {
      name: customName.trim(),
      emoji: "🍸",
      volumeMl,
      abv,
    };

    await addDrink(newDrink);

    if (saveFavourite) {
      const alreadyExists = favourites.some(
        (drink) =>
          drink.name.toLowerCase() ===
            newDrink.name.toLowerCase() &&
          drink.volumeMl === newDrink.volumeMl &&
          drink.abv === newDrink.abv
      );
    
      if (!alreadyExists) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
    
        if (user) {
          const { data, error } = await supabase
            .from("drink_favourites")
            .insert({
              user_id: user.id,
              name: newDrink.name,
              emoji: newDrink.emoji,
              volume_ml: newDrink.volumeMl,
              abv: newDrink.abv,
            })
            .select()
            .single();
    
          if (error) {
            console.error(
              "Could not save favourite:",
              error.message
            );
          } else {
            const savedFavourite =
              data as DatabaseFavourite;
    
            setFavourites((current) => [
              {
                id: savedFavourite.id,
                name: savedFavourite.name,
                emoji: savedFavourite.emoji,
                volumeMl: Number(
                  savedFavourite.volume_ml
                ),
                abv: Number(savedFavourite.abv),
              },
              ...current,
            ]);
          }
        }
      }
    }

    setCustomName("");
    setCustomVolume("");
    setCustomAbv("");
    setSaveFavourite(true);
    setShowCustomForm(false);
  }

  async function removeFavourite(
    favourite: Drink
  ) {
    if (!favourite.id) return;
  
    const { error } = await supabase
      .from("drink_favourites")
      .delete()
      .eq("id", favourite.id);
  
    if (error) {
      console.error(
        "Could not remove favourite:",
        error.message
      );
      return;
    }
  
    setFavourites((current) =>
      current.filter(
        (drink) => drink.id !== favourite.id
      )
    );
  }

  async function undoLastDrink() {
    if (todaysLogs.length === 0) return;

    const lastDrink = todaysLogs[0];

    const { error } = await supabase
      .from("drink_logs")
      .delete()
      .eq("id", lastDrink.id);

    if (error) {
      console.error("Could not undo drink:", error);
      alert("Could not undo drink.");
      return;
    }

    setLogs((current) =>
      current.filter((log) => log.id !== lastDrink.id)
    );
  }

  async function logOut() {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }

  function formatTime(dateString: string) {
    return new Date(dateString).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
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
        <header className="mb-8 flex items-start justify-between">
          <div>
          

            <h1 className="mt-1 text-3xl font-bold">
              Drink Tracker
            </h1>
          </div>

          <button
            onClick={logOut}
            className="text-sm text-gray-500"
          >
            Log out
          </button>
        </header>

        <section className="mb-8 rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-400">
            Tonight
          </p>

          <div className="mt-5 flex items-end justify-between">
            <div>
              <p className="text-5xl font-bold">
                {todaysLogs.length}
              </p>

              <p className="mt-1 text-gray-500">
                {todaysLogs.length === 1
                  ? "drink"
                  : "drinks"}
              </p>
            </div>

            <div className="text-right">
              <p className="text-2xl font-semibold">
                {totalAlcoholMl.toFixed(1)} mL
              </p>

              <p className="text-sm text-gray-500">
                pure alcohol
              </p>
            </div>
          </div>

          {todaysLogs.length > 0 && (
            <button
              onClick={undoLastDrink}
              className="mt-5 text-sm font-medium text-gray-500 underline underline-offset-4"
            >
              Undo last drink
            </button>
          )}
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Quick Add
            </h2>

            <button
  onClick={() => {
    setShowCustomForm(true);

    setTimeout(() => {
      customFormRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 100);
  }}
  className="text-sm font-medium text-gray-600 transition active:scale-95"
>
  + Custom
</button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {defaultDrinks.map((drink) => (
              <button
                key={drink.name}
                onClick={() => addDrink(drink)}
                className="rounded-2xl bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:scale-95"
              >
                <div className="text-3xl">
                  {drink.emoji}
                </div>

                <p className="mt-4 font-semibold">
                  {drink.name}
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  {drink.volumeMl} mL · {drink.abv}% ABV
                </p>
              </button>
            ))}
          </div>
        </section>

        {favourites.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Favourites
            </h2>

            <div className="space-y-3">
            {favourites.map((drink) => (
                <div
                key={drink.id}
                  className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm"
                >
                  <button
  onClick={() => addDrink(drink)}
  className="flex flex-1 items-center gap-4 rounded-xl text-left transition active:scale-[0.98] active:bg-gray-50"
>
                    <div className="text-2xl">
                      {drink.emoji}
                    </div>

                    <div>
                      <p className="font-semibold">
                        {drink.name}
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        {drink.volumeMl} mL · {drink.abv}% ABV
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() =>
                      removeFavourite(drink)
                    }
                    className="ml-4 rounded-lg px-2 py-2 text-xs text-gray-400 transition active:scale-95 active:bg-gray-100"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

{showCustomForm && (
  <section
    ref={customFormRef}
    className="mt-6 rounded-3xl bg-white p-5 shadow-sm"
  >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Add Custom Drink
              </h2>

              <button
                onClick={() =>
                  setShowCustomForm(false)
                }
                className="text-sm text-gray-400 transition active:scale-95"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">
                  Drink name
                </label>

                <input
                  value={customName}
                  onChange={(e) =>
                    setCustomName(e.target.value)
                  }
                  placeholder="e.g. High Noon"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-gray-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">
                  Volume (mL)
                </label>

                <input
                  type="number"
                  value={customVolume}
                  onChange={(e) =>
                    setCustomVolume(e.target.value)
                  }
                  placeholder="355"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-gray-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">
                  ABV (%)
                </label>

                <input
                  type="number"
                  step="0.1"
                  value={customAbv}
                  onChange={(e) =>
                    setCustomAbv(e.target.value)
                  }
                  placeholder="4.5"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-gray-500"
                />
              </div>

              <label className="flex items-center gap-3 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={saveFavourite}
                  onChange={(e) =>
                    setSaveFavourite(e.target.checked)
                  }
                />

                Save as favourite
              </label>

              <button
                onClick={addCustomDrink}
                className="w-full rounded-xl bg-gray-900 px-4 py-3 font-semibold text-white"
              >
                Add Drink
              </button>
            </div>
          </section>
        )}

        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Recent
            </h2>

            <a
              href="/history"
              className="text-sm font-medium text-gray-600"
            >
              View all
            </a>
          </div>

          {todaysLogs.length === 0 ? (
            <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
              <p className="font-medium text-gray-700">
                No drinks logged today
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {todaysLogs.slice(0, 3).map((log) => (
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
          )}
        </section>
      </div>

      <BottomNav />
    </main>
  );
}