# This is the repo for a blog posted at https://matt.martz.codes/how-to-automatically-generate-request-models-from-typescript-interfaces

```bash
# Unvalidated - Valid
$ curl --location --request POST 'https://<your api url>/prod/unvalidated/sdfg/basic' \
--header 'Content-Type: application/json' \
--data-raw '{
    "someString": "qwerty",
    "someNumber": 1234
}'
Hello sdfg.  How many times have you qwerty?  1234 times.%

# Unvalidated - Invalid
$ curl --location --request POST 'https://<your api url>/prod/unvalidated/sdfg/basic' \
--header 'Content-Type: application/json' \
--data-raw '{
    "someString": "qwerty",
    "someNumber": "asdf"
}'
Hello sdfg.  How many times have you qwerty?  asdf times.%

# Unvalidated - Missing Path Param
$ curl --location --request POST 'https://<your api url>/prod/unvalidated//basic' \
--header 'Content-Type: application/json' \
--data-raw '{
    "someString": "qwerty",
    "someNumber": 1234
}'
Hello no one.  How many times have you qwerty?  1234 times.%

# Validated - Valid
$ curl --location --request POST 'https://<your api url>/prod/validated/sdfg/basic' \
--header 'Content-Type: application/json' \
--data-raw '{
    "someString": "qwerty",
    "someNumber": 1234
}'
Hello sdfg.  How many times have you qwerty?  1234 times.%

# Validated - Invalid
$ curl --location --request POST 'https://<your api url>/prod/validated/sdfg/basic' \
--header 'Content-Type: application/json' \
--data-raw '{
    "someString": "qwerty",
    "someNumber": "asdf"
}'
{"message": "Invalid request body"}%

# Validated - Missing Path Param
$ curl --location --request POST 'https://<your api url>/prod/validated//basic' \
--header 'Content-Type: application/json' \
--data-raw '{
    "someString": "qwerty",
    "someNumber": 1234
}'
{"message": "Missing required request parameters: [hello]"}%
```