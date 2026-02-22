import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient("https://giant-heron-232.convex.cloud");

async function main() {
    try {
        const campaign = await client.query("campaigns:getCampaignById" as any, { id: "jh7a0ap0ggd0w16rjnn1b8d33s81nn53" });
        console.log("Campaign details in local DB:");
        console.log(JSON.stringify(campaign, null, 2));
    } catch (e) {
        console.error("Failed to query campaign:", e.message);
    }
}

main();
