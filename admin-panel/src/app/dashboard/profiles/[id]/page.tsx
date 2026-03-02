"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { profileService } from "@/services/profileService";
import LoadingSpinner from "@/components/LoadingSpinner";
import Button from "@/components/Button";
import { ArrowLeft, Edit, Mail, Phone, MapPin, Linkedin, Github } from "lucide-react";
import { formatDate } from "@/utils/dateUtils";

export default function ProfileViewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", id],
    queryFn: () => profileService.getById(id),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!profile) {
    return <div>Profile not found</div>;
  }

  return (
    <>
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push("/dashboard/profiles")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Profile Details</h1>
        <Button onClick={() => router.push(`/dashboard/profiles/${id}/edit`)}>
          <Edit className="w-5 h-5" />
          Edit Profile
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{profile.full_name}</h2>
          <p className="text-gray-600 mt-2">{profile.summary}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-gray-700">
            <Mail className="w-5 h-5" />
            <span>{profile.email}</span>
          </div>
          {profile.phone && (
            <div className="flex items-center gap-2 text-gray-700">
              <Phone className="w-5 h-5" />
              <span>{profile.phone}</span>
            </div>
          )}
          {profile.location && (
            <div className="flex items-center gap-2 text-gray-700">
              <MapPin className="w-5 h-5" />
              <span>{profile.location}</span>
            </div>
          )}
          {profile.linkedin && (
            <div className="flex items-center gap-2 text-gray-700">
              <Linkedin className="w-5 h-5" />
              <a href={profile.linkedin} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                LinkedIn Profile
              </a>
            </div>
          )}
          {profile.github && (
            <div className="flex items-center gap-2 text-gray-700">
              <Github className="w-5 h-5" />
              <a href={profile.github} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                GitHub Profile
              </a>
            </div>
          )}
        </div>

        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Education</h3>
          <div className="space-y-4">
            {profile.education.map((edu, index) => (
              <div key={index} className="border-l-4 border-primary-500 pl-4">
                <h4 className="font-semibold text-gray-900">{edu.degree} in {edu.field_of_study}</h4>
                {edu.university && <p className="text-gray-700">{edu.university}</p>}
                <p className="text-sm text-gray-600">
                  {formatDate(edu.start_date)} - {edu.end_date ? formatDate(edu.end_date) : "Present"}
                </p>
                {edu.location && <p className="text-sm text-gray-600">{edu.location}</p>}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Work Experience</h3>
          <div className="space-y-4">
            {profile.work_experience.map((exp, index) => (
              <div key={index} className="border-l-4 border-green-500 pl-4">
                <h4 className="font-semibold text-gray-900">{exp.job_title}</h4>
                {exp.company && <p className="text-gray-700">{exp.company}</p>}
                <p className="text-sm text-gray-600">
                  {formatDate(exp.start_date)} - {exp.end_date ? formatDate(exp.end_date) : "Present"}
                </p>
                {exp.employment_type && <p className="text-sm text-gray-600">{exp.employment_type}</p>}
                {exp.location && <p className="text-sm text-gray-600">{exp.location}</p>}
                {exp.description && <p className="text-gray-700 mt-2">{exp.description}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
