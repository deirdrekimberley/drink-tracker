"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";

type Drink = {
  id: number;
  name: string;
  brand: string | null;
  category: string | null;
  emoji: string;
  default_volume_ml: number;
  abv: number;
};



export default function SearchPage() {
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [search, setSearch] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState("");
  const [showCustomForm, setShowCustomForm] =
  useState(false);
  const [saveAsFavourite, setSaveAsFavourite] = useState(false);
const [customName, setCustomName] =
  useState("");
  

const [customBrand, setCustomBrand] =
  useState("");

const [customVolume, setCustomVolume] =
  useState("");

const [customAbv, setCustomAbv] =
  useState("");

  useEffect(() => {
    async function loadDrinks() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/auth";
        return;
      }

      const { data, error } = await supabase
        .from("drinks")
        .select("*")
        .order("name", { ascending: true });

      if (error) {
        console.error(
          "Could not load drinks:",
          error.message
        );

        setLoaded(true);
        return;
      }

      setDrinks((data ?? []) as Drink[]);
      setLoaded(true);
    }

    loadDrinks();
  }, []);

  const filteredDrinks = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return drinks;
    }

    return drinks.filter((drink) => {
      const searchableText = [
        drink.name,
        drink.brand ?? "",
        drink.category ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [drinks, search]);



 
  async function logDrink(drink: Drink) {

    
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/auth";
      return;
    }

    const volumeMl = Number(
      drink.default_volume_ml
    );

    const abv = Number(drink.abv);

    const pureAlcoholMl =
      volumeMl * (abv / 100);

    const { error } = await supabase
      .from("drink_logs")
      .insert({
        user_id: user.id,
        name: drink.name,
        emoji: drink.emoji,
        volume_ml: volumeMl,
        abv,
        pure_alcohol_ml: pureAlcoholMl,
      });

    if (error) {
      console.error(
        "Could not log drink:",
        error.message
      );

      setMessage("Could not log drink.");
      return;
    }

    setMessage(`${drink.name} logged.`);
  }

  async function logCustomDrink() {
    setMessage("");
  
    if (
      !customName.trim() ||
      !customVolume ||
      !customAbv
    ) {
      setMessage("Fill in all drink details.");
      return;
    }
  
    const volumeMl = Number(customVolume);
    const abv = Number(customAbv);
  
    if (
      volumeMl <= 0 ||
      abv <= 0 ||
      abv > 100
    ) {
      setMessage(
        "Enter a valid volume and ABV."
      );
      return;
    }
  
    const {
      data: { user },
    } = await supabase.auth.getUser();
  
    if (!user) {
      window.location.href = "/auth";
      return;
    }
  
    const pureAlcoholMl =
      volumeMl * (abv / 100);
  
    const { error } = await supabase
      .from("drink_logs")
      .insert({
        user_id: user.id,
        name: customName.trim(),
        emoji: "🍸",
        volume_ml: volumeMl,
        abv,
        pure_alcohol_ml: pureAlcoholMl,
      });
  
      if (error) {
        console.error(
          "Could not log custom drink:",
          error.message
        );
      
        setMessage("Could not log drink.");
        return;
      }
      
      if (saveAsFavourite) {
        const { error: favouriteError } = await supabase
          .from("drink_favourites")
          .insert({
            user_id: user.id,
            name: customName.trim(),
            emoji: "🍸",
            volume_ml: volumeMl,
            abv,
          });
      
        if (favouriteError) {
          console.error(
            "Could not save favourite:",
            favouriteError.message
          );
        }
      }
      
      setMessage(
        saveAsFavourite
          ? `${customName.trim()} logged and saved to favourites.`
          : `${customName.trim()} logged.`
      );
  
    setCustomName("");
    setCustomVolume("");
    setCustomAbv("");
    setShowCustomForm(false);
    setSaveAsFavourite(false);
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

  return (
    <main className="min-h-screen bg-gray-100 pb-24 text-gray-900">
      <div className="mx-auto max-w-md px-5 py-8">
        <header className="mb-6">
          <p className="text-sm font-medium text-gray-500">
            Drink Tracker
          </p>

          <h1 className="mt-1 text-3xl font-bold">
            Find a Drink
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Search the drink catalog and tap one to log it.
          </p>
        </header>

      

        <div className="mb-6">
  <input
    type="text"
    value={search}
    onChange={(e) =>
      setSearch(e.target.value)
    }
    placeholder="Search White Claw, Corona, tequila..."
    className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-4 outline-none focus:border-gray-500"
  />
</div>

{message && (
  <div className="mb-5 rounded-2xl bg-white p-4 text-sm font-medium shadow-sm">
    {message}
  </div>
)}


        <section className="space-y-3">
          {filteredDrinks.length === 0 ? (
           <div className="rounded-2xl bg-white p-6 shadow-sm">
           {!showCustomForm ? (
             <>
               <div className="text-center">
                 <p className="font-semibold">
                   No drinks found
                 </p>
         
                 <p className="mt-1 text-sm text-gray-500">
                   Can't find what you're drinking?
                 </p>
               </div>
         
               <button
                 onClick={() => {
                   setCustomName(search);
                   setShowCustomForm(true);
                 }}
                 className="mt-5 w-full rounded-xl bg-gray-900 px-4 py-3 font-semibold text-white"
               >
                 + Add custom drink
               </button>
             </>
           ) : (
             <div>
               <h3 className="text-lg font-semibold">
                 Add custom drink
               </h3>
         
               <div className="mt-5 space-y-4">
               <input
  value={customName}
  onChange={(e) =>
    setCustomName(e.target.value)
  }
  placeholder="Drink name"
  className="w-full rounded-xl border border-gray-300 px-4 py-3"
/>

<input
  value={customBrand}
  onChange={(e) =>
    setCustomBrand(e.target.value)
  }
  placeholder="Brand (optional)"
  className="w-full rounded-xl border border-gray-300 px-4 py-3"
/>

<input
  type="number"
  value={customVolume}
  onChange={(e) =>
    setCustomVolume(e.target.value)
  }
  placeholder="Volume (mL)"
  className="w-full rounded-xl border border-gray-300 px-4 py-3"
/>
         
         <input
  type="number"
  step="0.1"
  value={customAbv}
  onChange={(e) =>
    setCustomAbv(e.target.value)
  }
  placeholder="ABV (%)"
  className="w-full rounded-xl border border-gray-300 px-4 py-3"
/>

<label className="flex cursor-pointer items-center gap-3 rounded-xl bg-gray-50 p-4">
  <input
    type="checkbox"
    checked={saveAsFavourite}
    onChange={(e) =>
      setSaveAsFavourite(e.target.checked)
    }
    className="h-5 w-5"
  />

  <div>
    <p className="font-medium">
      Save to favourites
    </p>

    <p className="text-sm text-gray-500">
      Log this drink faster next time
    </p>
  </div>
</label>

<button
  onClick={logCustomDrink}
  className="w-full rounded-xl bg-gray-900 px-4 py-3 font-semibold text-white"
>
  Log Drink
</button>
         
                 <button
                   onClick={() =>
                     setShowCustomForm(false)
                   }
                   className="w-full py-2 text-sm text-gray-500"
                 >
                   Cancel
                 </button>
               </div>
             </div>
           )}
         </div>
          ) : (
            filteredDrinks.map((drink) => (
              <button
                key={drink.id}
                onClick={() => logDrink(drink)}
                className="flex w-full items-center justify-between rounded-2xl bg-white p-4 text-left shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="text-3xl">
                    {drink.emoji}
                  </div>

                  <div>
                    <p className="font-semibold">
                      {drink.name}
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      {drink.brand
                        ? `${drink.brand} · `
                        : ""}
                      {Number(
                        drink.default_volume_ml
                      )}{" "}
                      mL · {Number(drink.abv)}% ABV
                    </p>
                  </div>
                </div>

                <span className="text-sm font-semibold">
                  + Log
                </span>
              </button>
            ))
          )}
        </section>

      
 

      </div>

      <BottomNav />
    </main>
  );
}