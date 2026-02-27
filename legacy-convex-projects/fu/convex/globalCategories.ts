import { mutation, query } from "./_generated/server";

export const listGlobalCategories = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("globalCategories")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

export const initializeGlobalCategories = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if already initialized
    const existing = await ctx.db.query("globalCategories").first();
    if (existing) return { initialized: false };

    const defaults = [
      {
        name: "غرف نوم",
        nameEn: "Bedrooms",
        description: "أسرّة، خزائن ملابس، كومودينو، تسريحات",
        icon: "🛏️",
        image: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=400",
        style: "modern",
      },
      {
        name: "غرف معيشة",
        nameEn: "Living Rooms",
        description: "كنب، طاولات قهوة، وحدات تلفزيون، سجاد",
        icon: "🛋️",
        image: "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=400",
        style: "classic",
      },
      {
        name: "غرف طعام",
        nameEn: "Dining Rooms",
        description: "طاولات طعام، كراسي، بوفيهات، خزائن عرض",
        icon: "🍽️",
        image: "https://images.unsplash.com/photo-1617806118233-18e1de247200?w=400",
        style: "luxury",
      },
      {
        name: "مكتبي",
        nameEn: "Office",
        description: "مكاتب عمل، كراسي مكتب، أرفف، خزائن ملفات",
        icon: "💼",
        image: "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=400",
        style: "minimal",
      },
      {
        name: "إكسسوارات",
        nameEn: "Accessories",
        description: "مرايا، لوحات فنية، مزهريات، ديكورات",
        icon: "🎨",
        image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400",
        style: "modern",
      },
      {
        name: "إضاءة",
        nameEn: "Lighting",
        description: "ثريات، أباجورات، إضاءة أرضية، إضاءة حائط",
        icon: "💡",
        image: "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=400",
        style: "rustic",
      },
      {
        name: "غرف أطفال",
        nameEn: "Kids Rooms",
        description: "أسرّة أطفال، مكاتب دراسة، خزائن، ألعاب",
        icon: "🧸",
        image: "https://images.unsplash.com/photo-1617806118233-18e1de247200?w=400",
        style: "scandinavian",
      },
      {
        name: "حدائق وخارجية",
        nameEn: "Outdoor",
        description: "جلسات خارجية، طاولات حديقة، مظلات",
        icon: "🌳",
        image: "https://images.unsplash.com/photo-1600210492493-0946911123ea?w=400",
        style: "rustic",
      },
    ];

    const now = Date.now();
    for (const c of defaults) {
      await ctx.db.insert("globalCategories", {
        name: c.name,
        nameEn: c.nameEn,
        description: c.description,
        image: c.image,
        icon: c.icon,
        style: c.style,
        isActive: true,
        createdAt: now,
      });
    }

    return { initialized: true, count: defaults.length };
  },
});
