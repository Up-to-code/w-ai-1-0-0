import { mutation } from "./_generated/server";

export const seedContacts = mutation({
  handler: async (ctx) => {
    const contacts = [];
    for (let i = 0; i < 1000; i++) {
      const isVip = Math.random() > 0.8;
      contacts.push({
        name: `Test User ${i}`,
        phone: `201${String(i).padStart(9, '0')}`, // Dummy numbers
        email: `user${i}@example.com`,
        tags: isVip ? ["vip", "test"] : ["test"],
      });
    }

    // Insert in batches of 100
    for (let i = 0; i < contacts.length; i += 100) {
      const batch = contacts.slice(i, i + 100);
      await Promise.all(batch.map(c => ctx.db.insert("contacts", {
        ...c,
        isSubscribed: true,
        createdAt: Date.now()
      })));
    }

    return "Seeded 1000 contacts";
  }
});
