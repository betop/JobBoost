// The Resume Generator is a web application designed to help users create and manage professional resumes. It features distinct roles for Admins, who define global resume generation rules and manage user access, and Bidders, who create and maintain their personal resume profiles. Profiles include sections for education, work experience, and personal details, all subject to a global, sentence-based rule engine to ensure quality and consistency in resume generation. Access to profiles is managed through a token-based system.
workspace "Resume Generator" {
  acceptance = {ai_terms: false}
  preferences = {
    internal_docs    : false
    track_performance: true
    sql_names        : false
    sql_columns      : true
  }
}