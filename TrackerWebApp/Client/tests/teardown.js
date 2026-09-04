export default async function teardown() {
  try {
    await fetch("http://127.0.0.1:4173/__test/shutdown", { method: "POST" });
    // Give PostgreSQL's bounded graceful cleanup time before Playwright kills its child.
    for (let attempt = 0; attempt < 30; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      try {
        await fetch("http://127.0.0.1:4173/health/live");
      } catch {
        break;
      }
    }
  } catch {
    /* Server already stopped. */
  }
}
