#!/bin/bash
(cd database; ./pocketbase serve) &
nodemon src/index.ts && fg
