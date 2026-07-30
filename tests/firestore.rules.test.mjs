import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { readFile } from "node:fs/promises";

let environment;

before(async () => {
  environment = await initializeTestEnvironment({
    projectId: "kemet-rules-test",
    firestore: {
      rules: await readFile("firestore.rules", "utf8"),
    },
  });
  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "fields", "farm-a-field"), {
      farmId: "farm-a",
      name: "Farm A",
    });
  });
});

after(async () => {
  await environment.cleanup();
});

test("unauthenticated users cannot read operational records", async () => {
  const database = environment.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(database, "fields", "farm-a-field")));
});

test("members can read records only for their claimed farm", async () => {
  const farmA = environment.authenticatedContext("operator-a", {
    farmId: "farm-a",
  }).firestore();
  const farmB = environment.authenticatedContext("operator-b", {
    farmId: "farm-b",
  }).firestore();

  await assertSucceeds(getDoc(doc(farmA, "fields", "farm-a-field")));
  await assertFails(getDoc(doc(farmB, "fields", "farm-a-field")));
});

test("members cannot create records for another farm", async () => {
  const database = environment.authenticatedContext("operator-a", {
    farmId: "farm-a",
  }).firestore();

  await assertFails(
    setDoc(doc(database, "cropLogs", "wrong-farm"), {
      farmId: "farm-b",
      action: "irrigate",
    }),
  );
  await assertSucceeds(
    setDoc(doc(database, "cropLogs", "correct-farm"), {
      farmId: "farm-a",
      action: "irrigate",
    }),
  );
});

test("members cannot change a record's farm", async () => {
  const database = environment.authenticatedContext("operator-a", {
    farmId: "farm-a",
  }).firestore();

  await assertFails(
    setDoc(doc(database, "fields", "farm-a-field"), {
      farmId: "farm-b",
      name: "Moved",
    }),
  );
});

test("administrator custom claim can access all farms", async () => {
  const database = environment.authenticatedContext("admin", {
    admin: true,
  }).firestore();
  const snapshot = await assertSucceeds(
    getDoc(doc(database, "fields", "farm-a-field")),
  );
  assert.equal(snapshot.data().name, "Farm A");
});
