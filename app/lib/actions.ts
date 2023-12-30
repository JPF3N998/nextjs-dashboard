'use server'
import { z } from 'zod'
import { sql } from '@vercel/postgres'
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { State } from './definitions';

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: 'Please select a customer'
  }),
  amount: z.coerce.number().gt(0, {
    message: 'Please enter an amount greater than $0.'
  }),
  status: z.enum(['pending', 'paid'], {
    invalid_type_error: 'Please select an invoice status'
  }),
  date: z.string(),  
})

const CreateInvoice = FormSchema.omit({ id: true, date: true });

const INVOICES_PAGE = '/dashboard/invoices'

export async function createInvoice(prevState: State, formData: FormData) {
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  })
  
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing fields. Failed to create invoice'
    }
  }
  
  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;
  const date = new Date().toISOString().split('T')[0];

  try {
    await sql`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `
  } catch (e) {
    return {
      message: 'Database Error: Failed to Create Invoice'
    }
  }

  revalidatePath(INVOICES_PAGE)
  redirect(INVOICES_PAGE)
}

export async function updateInvoice(id: string, prevState: State, formData: FormData) {
  const validatedFields= CreateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  })
  
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing fields. Failed to create invoice'
    }
  }

  const {
    amount,
    customerId,
    status
  } = validatedFields.data

  const amountInCents = amount * 100
  
  try {
    await sql`
      UPDATE invoices 
      SET 
        customer_id = ${customerId},
        amount = ${amountInCents},
        status = ${status}
      WHERE id = ${id}
    `
  } catch (e) {
    return { message: 'Database Error: Failed to Update Invoice.' };
  }

  revalidatePath(INVOICES_PAGE)
  redirect(INVOICES_PAGE)
}

export async function deleteInvoice(id: string) {
  throw new Error('Failed to Delete Invoice');
  try {
    await sql`DELETE FROM invoices WHERE id = ${id}`
    revalidatePath(INVOICES_PAGE)
  } catch (e) {
    return { message: 'Database Error: Failed to Delete Invoice.' };
  }
}