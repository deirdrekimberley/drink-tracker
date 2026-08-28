"use client";

import { useEffect, useRef, useState } from "react";
import {
  Html5QrcodeScanner,
  Html5QrcodeSupportedFormats,
} from "html5-qrcode";

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
  barcode: string | null;
};

export default function ScanPage() {
  const [barcode, setBarcode] = useState("");
  const [drink, setDrink] = useState<Drink | null>(null);
  const [message, setMessage] = useState("");
  const [searching, setSearching] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
const [customName, setCustomName] = useState("");
const [customBrand, setCustomBrand] = useState("");
const [customVolume, setCustomVolume] = useState("");
const [customAbv, setCustomAbv] = useState("");

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const scannedRef = useRef(false);

  useEffect(() => {
    async function checkAuth() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/auth";
      }
    }

    checkAuth();

    const scanner = new Html5QrcodeScanner(
      "barcode-reader",
      {
        fps: 10,
        qrbox: {
          width: 280,
          height: 140,
        },
        formatsToSupport: [
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
        ],
        showTorchButtonIfSupported: true,
      },
      false
    );

    scannerRef.current = scanner;

    scanner.render(
      async (decodedText) => {
        if (scannedRef.current) {
          return;
        }

        scannedRef.current = true;

        setBarcode(decodedText);

        try {
          await scanner.clear();
        } catch {
          // Scanner may already be stopping.
        }

        await lookUpBarcode(decodedText);
      },
      () => {
        // Ignore normal scan failures while camera is searching.
      }
    );

    return () => {
      scanner
        .clear()
        .catch(() => {
          // Ignore cleanup errors.
        });
    };
  }, []);

  async function lookUpBarcode(code: string) {
    setSearching(true);
    setDrink(null);
    setMessage("");

    const { data, error } = await supabase
      .from("drinks")
      .select("*")
      .eq("barcode", code)
      .maybeSingle();

    if (error) {
      console.error(
        "Could not search barcode:",
        error.message
      );

      setMessage("Could not search for this barcode.");
      setSearching(false);
      return;
    }

    if (!data) {
        setMessage(
          "Barcode scanned, but this product is not in our catalog yet."
        );
      
        setShowCustomForm(true);
        setSearching(false);
        return;
      }

    setDrink(data as Drink);
    setSearching(false);
  }

  async function logDrink() {
    if (!drink) {
      return;
    }

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

  async function saveUnknownDrink() {
    setMessage("");
  
    if (
      !barcode ||
      !customName.trim() ||
      !customVolume ||
      !customAbv
    ) {
      setMessage("Fill in the drink name, volume, and ABV.");
      return;
    }
  
    const volumeMl = Number(customVolume);
    const abv = Number(customAbv);
  
    if (
      volumeMl <= 0 ||
      abv <= 0 ||
      abv > 100
    ) {
      setMessage("Enter a valid volume and ABV.");
      return;
    }
  
    const {
      data: { user },
    } = await supabase.auth.getUser();
  
    if (!user) {
      window.location.href = "/auth";
      return;
    }
  
    const { data: newDrink, error: drinkError } =
      await supabase
        .from("drinks")
        .insert({
          name: customName.trim(),
          brand: customBrand.trim() || null,
          category: null,
          emoji: "🍸",
          default_volume_ml: volumeMl,
          abv,
          barcode,
        })
        .select()
        .single();
  
    if (drinkError) {
      console.error(
        "Could not save drink:",
        drinkError.message
      );
  
      setMessage("Could not save this drink.");
      return;
    }
  
    const pureAlcoholMl =
      volumeMl * (abv / 100);
  
    const { error: logError } = await supabase
      .from("drink_logs")
      .insert({
        user_id: user.id,
        name: customName.trim(),
        emoji: "🍸",
        volume_ml: volumeMl,
        abv,
        pure_alcohol_ml: pureAlcoholMl,
      });
  
    if (logError) {
      console.error(
        "Could not log drink:",
        logError.message
      );
  
      setMessage(
        "Drink saved, but it could not be logged."
      );
      return;
    }
  
    setDrink(newDrink as Drink);
    setShowCustomForm(false);
  
    setMessage(
      `${customName.trim()} saved and logged.`
    );
  }

  function scanAnother() {
    window.location.reload();
  }

  return (
    <main className="min-h-screen bg-gray-100 pb-24 text-gray-900">
      <div className="mx-auto max-w-md px-5 py-8">
        <header className="mb-6">
          <p className="text-sm font-medium text-gray-500">
            Drink Tracker
          </p>

          <h1 className="mt-1 text-3xl font-bold">
            Scan Barcode
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Point your camera at the barcode on a can or bottle.
          </p>
        </header>

        {!barcode && (
          <div className="overflow-hidden rounded-3xl bg-white p-4 shadow-sm">
            <div id="barcode-reader" />
          </div>
        )}

        {searching && (
          <div className="mt-5 rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-gray-500">
              Looking up barcode...
            </p>
          </div>
        )}

        {barcode && (
          <div className="mt-5 rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Barcode
            </p>

            <p className="mt-1 font-mono font-semibold">
              {barcode}
            </p>
          </div>
        )}

        {drink && (
          <div className="mt-5 rounded-3xl bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="text-4xl">
                {drink.emoji}
              </div>

              <div>
                <h2 className="text-xl font-semibold">
                  {drink.name}
                </h2>

                {drink.brand && (
                  <p className="text-sm text-gray-500">
                    {drink.brand}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5 flex gap-6 text-sm">
              <div>
                <p className="font-semibold">
                  {Number(
                    drink.default_volume_ml
                  )}{" "}
                  mL
                </p>

                <p className="text-gray-500">
                  Volume
                </p>
              </div>

              <div>
                <p className="font-semibold">
                  {Number(drink.abv)}%
                </p>

                <p className="text-gray-500">
                  ABV
                </p>
              </div>
            </div>

            <button
              onClick={logDrink}
              className="mt-6 w-full rounded-xl bg-gray-900 px-4 py-3 font-semibold text-white"
            >
              Log Drink
            </button>
          </div>
        )}

        {message && (
          <div className="mt-5 rounded-2xl bg-white p-5 shadow-sm">
            <p>{message}</p>
          </div>
        )}

{showCustomForm && (
  <div className="mt-5 rounded-3xl bg-white p-6 shadow-sm">
    <h2 className="text-xl font-semibold">
      Add this drink
    </h2>

    <p className="mt-1 text-sm text-gray-500">
      Enter it once and this barcode will be recognized next time.
    </p>

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
        inputMode="decimal"
        value={customVolume}
        onChange={(e) =>
          setCustomVolume(e.target.value)
        }
        placeholder="Volume (mL)"
        className="w-full rounded-xl border border-gray-300 px-4 py-3"
      />

      <input
        type="number"
        inputMode="decimal"
        step="0.1"
        value={customAbv}
        onChange={(e) =>
          setCustomAbv(e.target.value)
        }
        placeholder="ABV (%)"
        className="w-full rounded-xl border border-gray-300 px-4 py-3"
      />

      <button
        onClick={saveUnknownDrink}
        className="w-full rounded-xl bg-gray-900 px-4 py-3 font-semibold text-white"
      >
        Save & Log Drink
      </button>
    </div>
  </div>
)}

        {barcode && (
          <button
            onClick={scanAnother}
            className="mt-5 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 font-semibold"
          >
            Scan Another
          </button>
        )}
      </div>

      <BottomNav />
    </main>
  );
}