import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  context: {
    params: Promise<{
      barcode: string;
    }>;
  }
) {
  const { barcode } = await context.params;

  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(
        barcode
      )}.json?fields=code,product_name,brands,quantity,product_quantity,product_quantity_unit,nutriments`,
      {
        headers: {
          "User-Agent":
            "DrinkTracker/1.0 (https://143-drink-tracker.vercel.app)",
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          found: false,
        },
        {
          status: 200,
        }
      );
    }

    const data = await response.json();

    if (data.status !== 1 || !data.product) {
      return NextResponse.json({
        found: false,
      });
    }

    const product = data.product;

    const alcoholCandidates = [
        product.nutriments?.alcohol_100g,
        product.nutriments?.alcohol,
        product.nutriments?.alcohol_value,
      ];
      
      let abv: number | null = null;
      
      for (const value of alcoholCandidates) {
        const parsed = Number(value);
      
        if (
          Number.isFinite(parsed) &&
          parsed > 0 &&
          parsed <= 100
        ) {
          abv = parsed;
          break;
        }
      }

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
      
        const multiMlMatch = quantity.match(
          /(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*ml/
        );
      
        const multiClMatch = quantity.match(
          /(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*cl/
        );
      
        const multiOzMatch = quantity.match(
          /(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(?:fl\s*)?oz/
        );
      
        const mlMatch = quantity.match(
          /(\d+(?:\.\d+)?)\s*ml/
        );
      
        const clMatch = quantity.match(
          /(\d+(?:\.\d+)?)\s*cl/
        );
      
        const litreMatch = quantity.match(
          /(\d+(?:\.\d+)?)\s*(?:l|litre|liter|litres|liters)\b/
        );
      
        const ozMatch = quantity.match(
          /(\d+(?:\.\d+)?)\s*(?:fl\s*)?oz/
        );
      
        if (multiMlMatch) {
            // Example: "6 x 355 ml" -> 355 mL per drink
            volumeMl =
              Number(multiMlMatch[2]);
          } else if (multiClMatch) {
            // Example: "6 x 33 cl" -> 330 mL per drink
            volumeMl =
              Number(multiClMatch[2]) * 10;
          } else if (multiOzMatch) {
            // Example: "12 x 12 fl oz" -> 355 mL per drink
            volumeMl =
              Number(multiOzMatch[2]) * 29.5735;
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
            Number(ozMatch[1]) * 29.5735;
        }
      }
      
      if (volumeMl) {
        volumeMl = Math.round(volumeMl);
      }

    return NextResponse.json({
      found: true,
      product: {
        barcode: product.code ?? barcode,
        name: product.product_name ?? "",
        brand: product.brands ?? "",
        quantity: product.quantity ?? "",
        volumeMl,
        abv,
      },
    });
  } catch (error) {
    console.error(
      "Open Food Facts lookup failed:",
      error
    );

    return NextResponse.json(
      {
        found: false,
      },
      {
        status: 200,
      }
    );
  }
}