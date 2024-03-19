export async function getUser() {
  await sleep(200);
  return { name: 'Lucy', age: 22 };
}

async function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
