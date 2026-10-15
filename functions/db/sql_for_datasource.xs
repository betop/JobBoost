// db.direct_query IGNORES the data source selected for the request (X-Data-Source header / editor): raw SQL
// always runs against the table names it contains. Live tables are named x1_<table id>; any other data source
// uses x1_<data source>_<table id> (e.g. x1_test_7). Call this on every raw SQL string before db.direct_query,
// writing live table names (x1_7) in the SQL as usual; they are rewritten for the data source of the request.
function "db/sql_for_datasource" {
  description = "Rewrite x1_<id> table names in raw SQL to the tables of the current data source"

  input {
    text sql?
  }

  stack {
    var $prefix {
      value = "x1_"
    }

    conditional {
      if ($env.$datasource != null && $env.$datasource != "" && $env.$datasource != "live") {
        var.update $prefix {
          value = "x1_" ~ $env.$datasource ~ "_"
        }
      }
    }

    var $rewritten {
      value = $input.sql|replace:"x1_":$prefix
    }
  }

  response = $rewritten
  guid = "pWZKbog7T1IdWyGb3ySFGvt6wrc"
}
