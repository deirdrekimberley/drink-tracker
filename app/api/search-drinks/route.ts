import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const query = searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json({
      results: [],
    });
  }

  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
        query
      )}&search_simple=1&action=process&json=1&page_size=10&fields=code,product_name,brands,quantity,product_quantity,product_quantity_unit,nutriments,categories_tags`,
      {
        headers: {
          "User-Agent":
            "DrinkTracker/1.0 (https://143-drink-tracker.vercel.app)",
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json({
        results: [],
      });
    }

    const data = await response.json();

    const products = Array.isArray(data.products)
      ? data.products
      : [];

    const results = products
      .map((product: any) => {
        const alcoholRaw =
          product.nutriments?.alcohol_100g ??
          product.nutriments?.alcohol ??
          product.nutriments?.alcohol_value;

        const alcoholNumber = Number(alcoholRaw);

        const abv =
          Number.isFinite(alcoholNumber) &&
          alcoholNumber > 0 &&
          alcoholNumber <= 100
            ? alcoholNumber
            : null;

        let volumeMl: number | null = null;

        const quantityValue = Number(
          product.product_quantity
        );

        const quantityUnit = String(
          product.product_quantity_unit || ""
        ).toLowerCase();

        if (
          Number.isFinite(quantityValue) &&
          quantityValue > 0
        ) {
          if (quantityUnit === "ml") {
            volumeMl = quantityValue;
          } else if (quantityUnit === "cl") {
            volumeMl = quantityValue * 10;
          } else if (quantityUnit === "l") {
            volumeMl = quantityValue * 1000;
          } else if (
            quantityUnit === "oz" ||
            quantityUnit === "fl oz" ||
            quantityUnit === "floz"
          ) {
            volumeMl =
              quantityValue * 29.5735;
          }
        }

        if (!volumeMl && product.quantity) {
          const quantity = String(
            product.quantity
          )
            .toLowerCase()
            .replace(",", ".");

          const multiMlMatch =
            quantity.match(
              /(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*ml/
            );

          const multiClMatch =
            quantity.match(
              /(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*cl/
            );

          const multiOzMatch =
            quantity.match(
              /(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(?:fl\s*)?oz/
            );

          const mlMatch =
            quantity.match(
              /(\d+(?:\.\d+)?)\s*ml/
            );

          const clMatch =
            quantity.match(
              /(\d+(?:\.\d+)?)\s*cl/
            );

          const litreMatch =
            quantity.match(
              /(\d+(?:\.\d+)?)\s*(?:l|litre|liter|litres|liters)\b/
            );

          const ozMatch =
            quantity.match(
              /(\d+(?:\.\d+)?)\s*(?:fl\s*)?oz/
            );

          if (multiMlMatch) {
            volumeMl =
              Number(multiMlMatch[2]);
          } else if (multiClMatch) {
            volumeMl =
              Number(multiClMatch[2]) * 10;
          } else if (multiOzMatch) {
            volumeMl =
              Number(multiOzMatch[2]) *
              29.5735;
          } else if (mlMatch) {
            volumeMl =
              Number(mlMatch[1]);
          } else if (clMatch) {
            volumeMl =
              Number(clMatch[1]) * 10;
          } else if (litreMatch) {
            volumeMl =
              Number(litreMatch[1]) * 1000;
          } else if (ozMatch) {
            volumeMl =
              Number(ozMatch[1]) *
              29.5735;
          }
        }

        if (volumeMl) {
          volumeMl = Math.round(volumeMl);
        }

        return {
          barcode: product.code ?? "",
          name: product.product_name ?? "",
          brand: product.brands ?? "",
          quantity: product.quantity ?? "",
          volumeMl,
          abv,
        };
      })
      .filter(
        (product: any) =>
          product.name || product.brand
      );

    return NextResponse.json({
      results,
    });
  } catch (error) {
    console.error(
      "External drink search failed:",
      error
    );

    return NextResponse.json({
      results: [],
    });
  }
}