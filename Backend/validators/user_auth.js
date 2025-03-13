// import {z} from 'zod';
const { z } = require('zod');

const userAuthSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8, {message: "password must be 8 or more characters long"}).max(50).regex(/[!@#$%^&*(),.?":{}|<>]/, {message: "password must contain at least one special character"})
});

module.exports={
    userAuthSchema
};