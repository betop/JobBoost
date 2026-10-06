// Single source of truth for how many free resume generations a new admin account receives.
// Change the number here to change the allowance for all future admin accounts.
function "credits/free_generation_allowance" {
  description = "Number of free resume generations granted to each new admin account"

  input {
  }

  stack {
    var $allowance {
      value = 3
    }
  }

  response = $allowance

  guid = "fR3eEtR1aLq8Zk2WmXn5Bv7CdHs"
}
