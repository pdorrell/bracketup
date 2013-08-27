// Say Hello World twice
for (var i=0; i<5; i++) {
  console.log("Hello World");
  if (i == 4) {
    throw new Error("I don't like " + i);
  }
}
