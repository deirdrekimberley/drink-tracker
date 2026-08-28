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

    const abv =
      typeof product.nutriments?.alcohol_100g ===
      "number"
        ? product.nutriments.alcohol_100g
        : null;

    const volumeMl =
      product.product_quantity_unit === "ml" &&
      typeof product.product_quantity === "number"
        ? product.product_quantity
        : null;

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