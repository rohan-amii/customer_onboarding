import React from 'react';
import { Profile } from '../../lib/supabase';
import { User, Building, Phone, Mail } from 'lucide-react';

interface ProfileCardProps {
  profile: Profile | null;
}

export function ProfileCard({ profile }: ProfileCardProps) {
  if (!profile) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-teal-600 px-6 py-8">
        <div className="text-center">
          <div className="mx-auto h-20 w-20 bg-white rounded-full flex items-center justify-center mb-4">
            <User className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-white">
            {profile.full_name || 'User'}
          </h3>
          <p className="text-blue-100">
            {profile.job_title || 'Member'}
          </p>
        </div>
      </div>

      <div className="px-6 py-6 space-y-4">
        <div className="flex items-center space-x-3">
          <Mail className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-600">{profile.email}</span>
        </div>

        {profile.phone && (
          <div className="flex items-center space-x-3">
            <Phone className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">{profile.phone}</span>
          </div>
        )}

        {profile.company_name && (
          <div className="flex items-center space-x-3">
            <Building className="h-4 w-4 text-gray-400" />
            <div>
              <div className="text-sm text-gray-600">{profile.company_name}</div>
              {profile.industry && (
                <div className="text-xs text-gray-400">{profile.industry}</div>
              )}
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-gray-200">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Member since</span>
            <span className="text-gray-900">
              {new Date(profile.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}