storage "raft" {
  path    = "/opt/trustnowailabs/trustnow-ai-worker-stack/data/vault"
  node_id = "trustnow-node-1"
}

listener "tcp" {
  address     = "127.0.0.1:8200"
  tls_disable = 1
}

cluster_addr  = "http://127.0.0.1:8201"
api_addr      = "http://127.0.0.1:8200"
disable_mlock = true
