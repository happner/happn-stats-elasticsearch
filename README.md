# happn-stats-elasticsearch
Elasticsearch plugin for [happn-stats](https://github.com/happner/happn-stats).

```
npm install happn-stats --global
npm install happn-stats-elasticsearch --global

happn-stats --plugin happn-stats-elasticsearch
```

Environment variables control plugin settings.

* `ELASTIC_URL` Optional elasticsearch address (default 'http://localhost:9200')
* `ELASTIC_INDEX` Optional index to save metrics into (default 'happn-stats')
* `ELASTIC_TYPE` Optional type to save the metrics as (default 'happn-stats')

```
# eg
ELASTIC_URL=http://127.0.0.1:9200 \
ELASTIC_INDEX=my-index \
ELASTIC_TYPE=my-type \
happn-stats --plugin happn-stats-elasticsearch
```

