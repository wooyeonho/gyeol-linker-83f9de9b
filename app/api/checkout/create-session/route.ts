import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { promptId, price } = body;

    if (!promptId || !price) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 사용자 인증 확인
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 프롬프트 존재 및 승인 상태 확인
    const { data: prompt, error: promptError } = await supabase
      .from("prompts")
      .select("id, title, price, status")
      .eq("id", promptId)
      .eq("status", "approved")
      .single();

    if (promptError || !prompt) {
      return NextResponse.json(
        { error: "Prompt not found or not approved" },
        { status: 404 }
      );
    }

    // 가격 검증
    if (prompt.price !== price) {
      return NextResponse.json(
        { error: "Price mismatch" },
        { status: 400 }
      );
    }

    // Lemon Squeezy 결제 세션 생성
    // TODO: 실제 Lemon Squeezy API 연동
    // 현재는 플레이스홀더 응답
    const lemonSqueezyApiKey = process.env.LEMON_SQUEEZY_API_KEY;
    const lemonSqueezyStoreId = process.env.LEMON_SQUEEZY_STORE_ID;

    if (!lemonSqueezyApiKey || !lemonSqueezyStoreId) {
      console.warn("Lemon Squeezy credentials not configured");
      return NextResponse.json(
        {
          error: "Payment service not configured",
          checkoutUrl: null,
        },
        { status: 503 }
      );
    }

    // Lemon Squeezy Checkout 생성
    // 실제 구현 시 Lemon Squeezy API 호출
    // const checkoutResponse = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${lemonSqueezyApiKey}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     data: {
    //       type: 'checkouts',
    //       attributes: {
    //         custom_price: price,
    //         product_options: {
    //           name: prompt.title,
    //           description: `Purchase: ${prompt.title}`,
    //         },
    //         checkout_options: {
    //           embed: false,
    //           media: false,
    //         },
    //         checkout_data: {
    //           custom: {
    //             prompt_id: promptId,
    //             user_id: user.id,
    //           },
    //         },
    //       },
    //       relationships: {
    //         store: {
    //           data: {
    //             type: 'stores',
    //             id: lemonSqueezyStoreId,
    //           },
    //         },
    //       },
    //     },
    //   }),
    // });

    // 임시 응답 (개발 환경)
    return NextResponse.json({
      checkoutUrl: `/checkout/${promptId}/payment?price=${price}`,
      sessionId: `temp_session_${Date.now()}`,
    });
  } catch (error) {
    console.error("Checkout session creation error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}



