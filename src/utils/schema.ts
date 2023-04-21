import { z } from "zod"

export const UsersSchema = z.array(
  z.object({
    id: z.string(),
    team_id: z.string(),
    name: z.string(),
    deleted: z.boolean(),
    color: z.string(),
    real_name: z.string(),
    tz: z.string(),
    tz_label: z.string(),
    tz_offset: z.number(),
    profile: z.object({
      first_name: z.string(),
      last_name: z.string(),
      real_name: z.string(),
      real_name_normalized: z.string(),
      display_name: z.string(),
      display_name_normalized: z.string(),
      email: z.string(),
      skype: z.string(),
      phone: z.string(),
      image_24: z.string(),
      image_32: z.string(),
      image_48: z.string(),
      image_72: z.string(),
      image_192: z.string(),
      image_512: z.string(),
      image_original: z.string(),
      title: z.string(),
      status_expiration: z.number(),
      team: z.string(),
      fields: z.array(z.unknown()),
    }),
    is_bot: z.boolean(),
    is_admin: z.boolean(),
    is_owner: z.boolean(),
    is_primary_owner: z.boolean(),
    is_restricted: z.boolean(),
    is_ultra_restricted: z.boolean(),
    is_stranger: z.boolean(),
    is_app_user: z.boolean(),
    is_invited_user: z.boolean(),
    has_2fa: z.boolean(),
    has_files: z.boolean(),
    presence: z.string(),
    locale: z.string(),
    updated: z.number(),
    enterprise_user: z.object({
      id: z.string(),
      enterprise_id: z.string(),
      enterprise_name: z.string(),
      is_admin: z.boolean(),
      is_owner: z.boolean(),
      teams: z.null(),
    }),
  })
)

export const ChannelSchema = z.object({
  name: z.string(),
  messages: z.array(
    z.object({
      client_msg_id: z.string().optional(),
      user: z.string(),
      text: z.string(),
    })
  ),
  channel_id: z.string(),
})
