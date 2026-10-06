workflow_test "access_key_ip_whitelist" {
  stack {
    // empty / null / blank-only whitelist allows any ip
    function.run "security/ip_in_whitelist" { input = {ip: "1.2.3.4", allowed_ips: []} } as $a1
    expect.to_be_true ($a1)
    function.run "security/ip_in_whitelist" { input = {ip: "1.2.3.4"} } as $a2
    expect.to_be_true ($a2)
    function.run "security/ip_in_whitelist" { input = {ip: "1.2.3.4", allowed_ips: ["  ", ""]} } as $a3
    expect.to_be_true ($a3)

    // non-empty whitelist: listed ip allowed, other rejected
    function.run "security/ip_in_whitelist" { input = {ip: "38.23.34.57", allowed_ips: ["10.0.0.1", "38.23.34.57"]} } as $b1
    expect.to_be_true ($b1)
    function.run "security/ip_in_whitelist" { input = {ip: "38.23.34.58", allowed_ips: ["10.0.0.1", "38.23.34.57"]} } as $b2
    expect.to_be_false ($b2)

    // normalization: spaces, ::ffff:, IPv6 case
    function.run "security/ip_in_whitelist" { input = {ip: "38.23.34.57", allowed_ips: ["  ::ffff:38.23.34.57 "]} } as $c1
    expect.to_be_true ($c1)
    function.run "security/ip_in_whitelist" { input = {ip: "::ffff:38.23.34.57", allowed_ips: ["38.23.34.57"]} } as $c2
    expect.to_be_true ($c2)
    function.run "security/ip_in_whitelist" { input = {ip: "2001:DB8::1", allowed_ips: [" 2001:db8::1"]} } as $c3
    expect.to_be_true ($c3)

    // list validation
    function.run "security/normalize_ip_list" { input = {ips: [" 1.2.3.4 ", "::ffff:1.2.3.4", "2001:DB8::1", "", "1.2.3.4"]} } as $n1
    expect.to_equal ($n1.entries|count) { value = 2 }
    expect.to_equal ($n1.entries[0]) { value = "1.2.3.4" }
    expect.to_equal ($n1.entries[1]) { value = "2001:db8::1" }
    expect.to_be_null ($n1.invalid_entry)

    function.run "security/normalize_ip_list" { input = {ips: ["1.2.3.4", "10.0.0.0/8"]} } as $n2
    expect.to_equal ($n2.invalid_entry) { value = "10.0.0.0/8" }
    function.run "security/normalize_ip_list" { input = {ips: ["999.1.1.1"]} } as $n3
    expect.to_equal ($n3.invalid_entry) { value = "999.1.1.1" }
    function.run "security/normalize_ip_list" { input = {ips: ["hello"]} } as $n4
    expect.to_equal ($n4.invalid_entry) { value = "hello" }
    function.run "security/normalize_ip_list" { input = {ips: ["1:2:3:4:5:6:7:8:9"]} } as $n5
    expect.to_equal ($n5.invalid_entry) { value = "1:2:3:4:5:6:7:8:9" }
    function.run "security/normalize_ip_list" { input = {ips: ["::1", "fe80::1", "1.1.1.1"]} } as $n6
    expect.to_be_null ($n6.invalid_entry)
    expect.to_equal ($n6.entries|count) { value = 3 }
    function.run "security/normalize_ip_list" { input = {ips: []} } as $n7
    expect.to_equal ($n7.entries|count) { value = 0 }

    // migration (dry_run only: it must never write from a test, a real run could re-lock keys whose whitelist was cleared later)
    security.create_uuid as $nil
    var $sfx { value = (now|to_timestamp) ~ "" }
    db.add users { data = {full_name: "IPMIG", email: "ipmig" ~ $sfx ~ "@t.invalid", type: "bidder", assigned_ip: " ::ffff:9.9.9.9 ", created_by: $nil} } as $u
    db.add access_token { data = {user_id: $u.id, token: "ipmig-a" ~ $sfx, is_active: true, created_by_admin_id: $nil} } as $k1
    db.add access_token { data = {user_id: $u.id, token: "ipmig-b" ~ $sfx, is_active: true, allowed_ips: ["8.8.8.8"], created_by_admin_id: $nil} } as $k2
    function.run "maintenance/migrate_assigned_ip_to_keys" { input = {dry_run: true} } as $m
    var $mine { value = $m.affected_users|filter:$$.user_id == $u.id }
    expect.to_equal ($mine|count) { value = 1 }
    expect.to_equal ($mine[0].keys_updated) { value = 1 }
    expect.to_equal ($mine[0].ip) { value = "9.9.9.9" }
    db.get access_token {
      field_name = "id"
      field_value = $k1.id
    } as $r1
    expect.to_be_null ($r1.allowed_ips)
  }
  guid = "Ak9IpWhitelistTestR5vNb3Ys"
}
