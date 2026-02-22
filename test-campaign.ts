const url = "https://hardy-gopher-480.convex.cloud/api/query";
const body = {
    path: "campaigns:list",
    args: {},
    format: "json"
};

async function main() {
    try {
        console.log("Fetching campaigns from hardy-gopher-480 (Vercel's true environment)...");
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (data.status === "success") {
            const campaigns = data.value;
            const targetCampaign = campaigns.find((c: any) => c._id === "jh7a0ap0ggd0w16rjnn1b8d33s81nn53");

            if (targetCampaign) {
                console.log("\n✅ Found Campaign Details:");
                console.log(JSON.stringify(targetCampaign, null, 2));
            } else {
                console.log("\n❌ Campaign jh7a0ap0ggd0w16rjnn1b8d33s81nn53 not found in the latest 20 campaigns.");
                console.log("Available recent campaign IDs:");
                campaigns.forEach((c: any) => console.log(`- ${c._id} '${c.name}' (Status: ${c.status})`));
            }
        } else {
            console.error("❌ Error from Convex API:", data.errorMessage);
        }
    } catch (e) {
        console.error("Failed to query campaign:", e);
    }
}

main();
