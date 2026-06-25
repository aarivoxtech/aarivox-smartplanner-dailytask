export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  mobileNumber: string;
  profilePicture?: string;
  settings: {
    notificationsEnabled: boolean;
    alarmEnabled: boolean;
    alarmSound: string;
  };
}
