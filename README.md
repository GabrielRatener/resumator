# CatBox
## Start chatting with a bang!

### Start Server and REPL

```
$ node index.js         # defaults to port 80
$ node index.js 8080    # specify port
```

### REPL API

```
Enter js here, or type "help()"
>> chat.create(3, "Let's chat loudly!")       // create's 3-member chat titled "Let's chat loudly!"
Generating chat...
 chat id: 4669f5e8-4a00-41f6-81e8-b2bc5908a645
 urls:
  http://localhost/4669f5e8-4a00-41f6-81e8-b2bc5908a645/beff1d75-8e59-4de7-833f-03369f0f0f91
  http://localhost/4669f5e8-4a00-41f6-81e8-b2bc5908a645/5ad1a281-5324-4113-ac2f-59c3994d3dde
  http://localhost/4669f5e8-4a00-41f6-81e8-b2bc5908a645/4fe2946c-4483-4dd3-8e5e-7471c19dbf95
  
>> chat.delete('4669f5e8-4a00-41f6-81e8-b2bc5908a645')      // delete the newly created chat
deleted chat "4669f5e8-4a00-41f6-81e8-b2bc5908a645"
```

Distribute the 3 (or however many) URLs are generated, to yourself and others, and let the chatting begin!
